// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title FairplayVault — Commit–Reveal USDC pools with optional dual-commit sentinel, instant payouts, and fee splits.
/// @notice Designed for Farcaster minis / on-chain games. No VRF required.

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from,address to,uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

library TokenSafe {
    error ERC20_TransferFailed();
    error ERC20_TransferFromFailed();
    function safeTransfer(IERC20 t, address to, uint256 amt) internal { if (!t.transfer(to, amt)) revert ERC20_TransferFailed(); }
    function safeTransferFrom(IERC20 t, address from, address to, uint256 amt) internal { if (!t.transferFrom(from, to, amt)) revert ERC20_TransferFromFailed(); }
}

abstract contract ReentrancyGuard {
    uint256 private _guard = 1;
    modifier nonReentrant() { require(_guard == 1, "REENTRANCY"); _guard = 2; _; _guard = 1; }
}

contract FairplayVault is ReentrancyGuard {
    using TokenSafe for IERC20;

    uint256 public constant MAX_BPS = 10_000;

    error NotOwner();
    error SentinelOnly();
    error BadParams();
    error FeesTooHigh();
    error DeadlinePassed();
    error DeadlineNotReached();
    error MaxEntriesReached();
    error MinEntriesNotMet();
    error AlreadyDrawnOrCanceled();
    error RevealWindowOver();
    error RevealWindowNotOver();
    error InvalidCommit();
    error NothingToWithdraw();
    error TransferInRequired();

    struct Pool {
        address creator;
        address builderFeeRecipient;
        uint64  deadline;
        uint64  revealDeadline;
        uint64  sentinelRevealDeadline;
        uint32  maxEntries;
        uint32  minEntries;
        uint96  entryPrice;
        uint16  builderFeeBps;
        uint16  protocolFeeBps;
        bytes32 creatorCommitHash;
        bytes32 sentinelCommitHash;
        address sentinel;
        uint96  creatorBond;
        uint96  sentinelBond;
        uint32  entries;
        bool    creatorRevealed;
        bool    sentinelRevealed;
        bool    drawn;
        bool    canceled;
        address winner;
        bytes32 _creatorSalt;
        bytes32 _sentinelSalt;
        uint128 grossCollected;
    }

    /// @dev Used only for createPool to avoid stack-too-deep.
    struct CreateParams {
        uint64  deadline;
        uint64  revealDeadline;
        uint64  sentinelRevealDeadline; // 0 if no sentinel
        uint32  maxEntries;
        uint32  minEntries;
        uint96  entryPrice;
        uint16  builderFeeBps;
        uint16  protocolFeeBps;
        bytes32 creatorCommitHash;
        uint96  creatorBond;
        address sentinel;               // address(0) if none
        bytes32 sentinelCommitHash;     // 0x0 if none
        uint96  sentinelBond;
        address builderFeeRecipient;    // fallback to creator if 0
    }

    IERC20  public immutable asset;
    address public protocolFeeRecipient;
    address public owner;

    uint256 public nextPoolId = 1;
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => address[]) internal _players;

    mapping(address => uint256) public protocolFees;
    mapping(address => uint256) public builderFees;

    event PoolCreated(
        uint256 indexed poolId,
        address indexed creator,
        uint64 deadline,
        uint64 revealDeadline,
        uint64 sentinelRevealDeadline,
        uint32 maxEntries,
        uint32 minEntries,
        uint96 entryPrice,
        uint16 builderFeeBps,
        uint16 protocolFeeBps,
        bool   hasSentinel
    );
    event Entered(uint256 indexed poolId, address indexed user, uint32 quantity, uint256 amount);
    event CreatorRevealed(uint256 indexed poolId, bytes32 salt);
    event SentinelRevealed(uint256 indexed poolId, bytes32 salt);
    event RandomnessResolved(uint256 indexed poolId, uint256 randomWord, address indexed winner, uint256 prize);
    event PrizePaid(uint256 indexed poolId, address indexed winner, uint256 amount);
    event Refunded(uint256 indexed poolId);
    event FeesAccrued(address indexed recipient, uint256 amount, bool protocol);
    event FeesWithdrawn(address indexed recipient, uint256 amount, bool protocol);
    event OwnerUpdated(address newOwner);
    event ProtocolFeeRecipientUpdated(address newRecipient);

    constructor(address usdc, address _protocolFeeRecipient, address _owner) {
        asset = IERC20(usdc);
        protocolFeeRecipient = _protocolFeeRecipient;
        owner = _owner == address(0) ? msg.sender : _owner;
    }

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }
    function setOwner(address n) external onlyOwner { owner = n; emit OwnerUpdated(n); }
    function setProtocolFeeRecipient(address n) external onlyOwner { protocolFeeRecipient = n; emit ProtocolFeeRecipientUpdated(n); }

    /// @notice Create a commit–reveal pool. Pass zeros for sentinel fields to disable dual-commit.
    function createPool(CreateParams calldata cp) external nonReentrant returns (uint256 poolId) {
        if (cp.deadline <= block.timestamp) revert BadParams();
        if (cp.revealDeadline <= cp.deadline) revert BadParams();
        if (cp.entryPrice == 0) revert BadParams();
        if (cp.builderFeeBps + cp.protocolFeeBps >= MAX_BPS) revert FeesTooHigh();
        if (cp.creatorCommitHash == bytes32(0)) revert BadParams();

        bool hasSentinel = cp.sentinelCommitHash != bytes32(0);
        if (hasSentinel) {
            if (cp.sentinel == address(0)) revert BadParams();
            if (cp.sentinelRevealDeadline <= cp.revealDeadline) revert BadParams();
        } else {
            if (cp.sentinel != address(0) || cp.sentinelRevealDeadline != 0 || cp.sentinelBond != 0) revert BadParams();
        }

        poolId = nextPoolId++;
        Pool storage p = pools[poolId];

        p.creator                 = msg.sender;
        p.builderFeeRecipient     = cp.builderFeeRecipient == address(0) ? msg.sender : cp.builderFeeRecipient;
        p.deadline                = cp.deadline;
        p.revealDeadline          = cp.revealDeadline;
        p.sentinelRevealDeadline  = cp.sentinelRevealDeadline;
        p.maxEntries              = cp.maxEntries;
        p.minEntries              = cp.minEntries;
        p.entryPrice              = cp.entryPrice;
        p.builderFeeBps           = cp.builderFeeBps;
        p.protocolFeeBps          = cp.protocolFeeBps;

        p.creatorCommitHash       = cp.creatorCommitHash;
        p.sentinelCommitHash      = cp.sentinelCommitHash;
        p.sentinel                = cp.sentinel;

        p.creatorBond             = cp.creatorBond;
        p.sentinelBond            = cp.sentinelBond;

        if (cp.creatorBond > 0) asset.safeTransferFrom(msg.sender, address(this), cp.creatorBond);
        if (hasSentinel && cp.sentinelBond > 0) asset.safeTransferFrom(msg.sender, address(this), cp.sentinelBond);

        emit PoolCreated(
            poolId,
            msg.sender,
            cp.deadline,
            cp.revealDeadline,
            cp.sentinelRevealDeadline,
            cp.maxEntries,
            cp.minEntries,
            cp.entryPrice,
            cp.builderFeeBps,
            cp.protocolFeeBps,
            hasSentinel
        );
    }

    function enter(uint256 poolId, uint32 quantity) external nonReentrant {
        Pool storage p = pools[poolId];
        if (p.drawn || p.canceled) revert AlreadyDrawnOrCanceled();
        if (block.timestamp >= p.deadline) revert DeadlinePassed();
        if (quantity == 0) revert BadParams();

        uint32 newEntries = p.entries + quantity;
        if (p.maxEntries != 0 && newEntries > p.maxEntries) revert MaxEntriesReached();

        uint256 cost = uint256(p.entryPrice) * quantity;
        if (cost == 0) revert TransferInRequired();
        asset.safeTransferFrom(msg.sender, address(this), cost);

        address[] storage players = _players[poolId];
        for (uint256 i = 0; i < quantity; i++) players.push(msg.sender);

        p.entries = newEntries;
        p.grossCollected += uint128(cost);
        emit Entered(poolId, msg.sender, quantity, cost);
    }

    function triggerRefunds(uint256 poolId) external nonReentrant {
        Pool storage p = pools[poolId];
        if (p.drawn || p.canceled) revert AlreadyDrawnOrCanceled();
        if (block.timestamp < p.deadline) revert DeadlineNotReached();
        if (p.minEntries != 0 && p.entries >= p.minEntries) revert MinEntriesNotMet();

        _refundAllEntries(poolId, p);

        if (p.creatorBond > 0) { asset.safeTransfer(p.creator, p.creatorBond); p.creatorBond = 0; }
        if (p.sentinelCommitHash != bytes32(0) && p.sentinelBond > 0) { asset.safeTransfer(p.sentinel, p.sentinelBond); p.sentinelBond = 0; }

        p.canceled = true;
        emit Refunded(poolId);
    }

    function revealCreator(uint256 poolId, bytes32 salt) external nonReentrant {
        Pool storage p = pools[poolId];
        if (p.drawn || p.canceled) revert AlreadyDrawnOrCanceled();
        if (block.timestamp < p.deadline) revert DeadlineNotReached();
        if (p.minEntries != 0 && p.entries < p.minEntries) revert MinEntriesNotMet();
        if (block.timestamp > p.revealDeadline) revert RevealWindowOver();
        if (keccak256(abi.encodePacked(salt)) != p.creatorCommitHash) revert InvalidCommit();

        p.creatorRevealed = true;
        p._creatorSalt = salt;
        emit CreatorRevealed(poolId, salt);

        _attemptDrawAfterReveals(poolId, p);
    }

    function revealSentinel(uint256 poolId, bytes32 salt) external nonReentrant {
        Pool storage p = pools[poolId];
        if (p.drawn || p.canceled) revert AlreadyDrawnOrCanceled();
        if (msg.sender != p.sentinel) revert SentinelOnly();
        if (p.sentinelCommitHash == bytes32(0)) revert BadParams();
        if (block.timestamp < p.deadline) revert DeadlineNotReached();
        if (block.timestamp > p.sentinelRevealDeadline) revert RevealWindowOver();
        if (keccak256(abi.encodePacked(salt)) != p.sentinelCommitHash) revert InvalidCommit();

        p.sentinelRevealed = true;
        p._sentinelSalt = salt;
        emit SentinelRevealed(poolId, salt);

        _attemptDrawAfterReveals(poolId, p);
    }

    function finalizeAfterDeadlines(uint256 poolId) external nonReentrant {
        Pool storage p = pools[poolId];
        if (p.drawn || p.canceled) revert AlreadyDrawnOrCanceled();
        if (block.timestamp < p.deadline) revert DeadlineNotReached();

        bool hasSentinel = (p.sentinelCommitHash != bytes32(0));

        // None revealed, both windows over -> refund & slash both bonds
        if (!p.creatorRevealed
            && (!hasSentinel || !p.sentinelRevealed)
            && block.timestamp > p.revealDeadline
            && (!hasSentinel || block.timestamp > p.sentinelRevealDeadline)
        ) {
            _refundAllEntries(poolId, p);
            if (p.creatorBond > 0) { protocolFees[protocolFeeRecipient] += p.creatorBond; emit FeesAccrued(protocolFeeRecipient, p.creatorBond, true); p.creatorBond = 0; }
            if (hasSentinel && p.sentinelBond > 0) { protocolFees[protocolFeeRecipient] += p.sentinelBond; emit FeesAccrued(protocolFeeRecipient, p.sentinelBond, true); p.sentinelBond = 0; }
            p.canceled = true;
            emit Refunded(poolId);
            return;
        }

        // Only creator revealed, sentinel missed -> draw with creator salt & slash sentinel bond
        if (p.creatorRevealed && (!hasSentinel || !p.sentinelRevealed) && (!hasSentinel || block.timestamp > p.sentinelRevealDeadline)) {
            if (hasSentinel && p.sentinelBond > 0) { protocolFees[protocolFeeRecipient] += p.sentinelBond; emit FeesAccrued(protocolFeeRecipient, p.sentinelBond, true); p.sentinelBond = 0; }
            uint256 rand = uint256(keccak256(abi.encodePacked(p._creatorSalt, blockhash(block.number - 1), poolId)));
            _returnBondsAfterDraw(p);
            _doDrawAndPayout(poolId, p, rand);
            return;
        }

        // Only sentinel revealed, creator missed -> draw with sentinel salt & slash creator bond
        if (!p.creatorRevealed && hasSentinel && p.sentinelRevealed && block.timestamp > p.revealDeadline) {
            if (p.creatorBond > 0) { protocolFees[protocolFeeRecipient] += p.creatorBond; emit FeesAccrued(protocolFeeRecipient, p.creatorBond, true); p.creatorBond = 0; }
            uint256 rand2 = uint256(keccak256(abi.encodePacked(p._sentinelSalt, blockhash(block.number - 1), poolId)));
            _returnBondsAfterDraw(p);
            _doDrawAndPayout(poolId, p, rand2);
            return;
        }

        revert RevealWindowNotOver();
    }

    function _attemptDrawAfterReveals(uint256 poolId, Pool storage p) internal {
        if (p.drawn || p.canceled) return;
        if (p.entries == 0) return;
        if (block.timestamp < p.deadline) return;

        bool hasSentinel = (p.sentinelCommitHash != bytes32(0));

        if (p.creatorRevealed && hasSentinel && p.sentinelRevealed) {
            uint256 rand = uint256(keccak256(abi.encodePacked(p._creatorSalt, p._sentinelSalt, blockhash(block.number - 1), poolId)));
            _returnBondsAfterDraw(p);
            _doDrawAndPayout(poolId, p, rand);
            return;
        }

        if (!hasSentinel && p.creatorRevealed) {
            uint256 rand2 = uint256(keccak256(abi.encodePacked(p._creatorSalt, blockhash(block.number - 1), poolId)));
            _returnBondsAfterDraw(p);
            _doDrawAndPayout(poolId, p, rand2);
        }
    }

    function _returnBondsAfterDraw(Pool storage p) internal {
        if (p.creatorBond > 0 && p.creatorRevealed) { asset.safeTransfer(p.creator, p.creatorBond); p.creatorBond = 0; }
        if (p.sentinelBond > 0 && p.sentinelRevealed) { asset.safeTransfer(p.sentinel, p.sentinelBond); p.sentinelBond = 0; }
    }

    function _refundAllEntries(uint256 poolId, Pool storage p) internal {
        address[] storage players = _players[poolId];
        uint256 n = players.length;
        if (n == 0) return;
        uint256 price = p.entryPrice;
        for (uint256 i = 0; i < n; i++) asset.safeTransfer(players[i], price);
    }

    function _doDrawAndPayout(uint256 poolId, Pool storage p, uint256 randomWord) internal {
        address[] storage players = _players[poolId];
        uint256 n = players.length;
        require(n == p.entries && n > 0, "NO_ENTRIES");

        address winner = players[randomWord % n];
        p.winner = winner;
        p.drawn = true;

        uint256 gross = p.grossCollected;
        uint256 builderCut  = (gross * p.builderFeeBps)  / MAX_BPS;
        uint256 protocolCut = (gross * p.protocolFeeBps) / MAX_BPS;
        uint256 prize       = gross - builderCut - protocolCut;

        if (builderCut > 0) { builderFees[p.builderFeeRecipient] += builderCut; emit FeesAccrued(p.builderFeeRecipient, builderCut, false); }
        if (protocolCut > 0) { protocolFees[protocolFeeRecipient] += protocolCut; emit FeesAccrued(protocolFeeRecipient, protocolCut, true); }

        asset.safeTransfer(winner, prize);

        emit RandomnessResolved(poolId, randomWord, winner, prize);
        emit PrizePaid(poolId, winner, prize);
    }

    function withdrawProtocolFees(address to) external nonReentrant {
        uint256 amt = protocolFees[msg.sender];
        if (amt == 0) revert NothingToWithdraw();
        protocolFees[msg.sender] = 0;
        asset.safeTransfer(to, amt);
        emit FeesWithdrawn(msg.sender, amt, true);
    }

    function withdrawBuilderFees(address to) external nonReentrant {
        uint256 amt = builderFees[msg.sender];
        if (amt == 0) revert NothingToWithdraw();
        builderFees[msg.sender] = 0;
        asset.safeTransfer(to, amt);
        emit FeesWithdrawn(msg.sender, amt, false);
    }

    function playersOf(uint256 poolId) external view returns (address[] memory) { return _players[poolId]; }

    function prizePreview(uint256 poolId) external view returns (uint256 prize, uint256 builderCut, uint256 protocolCut) {
        Pool storage p = pools[poolId];
        uint256 gross = p.grossCollected;
        builderCut  = (gross * p.builderFeeBps)  / MAX_BPS;
        protocolCut = (gross * p.protocolFeeBps) / MAX_BPS;
        prize       = gross - builderCut - protocolCut;
    }
}
