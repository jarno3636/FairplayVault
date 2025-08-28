export const FAIRPLAY_VAULT_ABI = [
  "event PoolCreated(uint256 indexed poolId,address indexed creator,uint64 deadline,uint64 revealDeadline,uint64 sentinelRevealDeadline,uint32 maxEntries,uint32 minEntries,uint96 entryPrice,uint16 builderFeeBps,uint16 protocolFeeBps,bool hasSentinel)",
  "event Entered(uint256 indexed poolId,address indexed user,uint32 quantity,uint256 amount)",
  "event CreatorRevealed(uint256 indexed poolId,bytes32 salt)",
  "event SentinelRevealed(uint256 indexed poolId,bytes32 salt)",
  "event RandomnessResolved(uint256 indexed poolId,uint256 randomWord,address indexed winner,uint256 prize)",
  "function nextPoolId() view returns (uint256)",
  "function pools(uint256) view returns (address creator,address builderFeeRecipient,uint64 deadline,uint64 revealDeadline,uint64 sentinelRevealDeadline,uint32 maxEntries,uint32 minEntries,uint96 entryPrice,uint16 builderFeeBps,uint16 protocolFeeBps,bytes32 creatorCommitHash,bytes32 sentinelCommitHash,address sentinel,uint96 creatorBond,uint96 sentinelBond,uint32 entries,bool creatorRevealed,bool sentinelRevealed,bool drawn,bool canceled,address winner,bytes32 _creatorSalt,bytes32 _sentinelSalt,uint128 grossCollected)",
  "function playersOf(uint256) view returns (address[])",
  "function prizePreview(uint256) view returns (uint256 prize,uint256 builderCut,uint256 protocolCut)",
  "function enter(uint256 poolId,uint32 quantity)",
  "function revealCreator(uint256 poolId,bytes32 salt)",
  "function revealSentinel(uint256 poolId,bytes32 salt)",
  "function finalizeAfterDeadlines(uint256 poolId)",
  "function withdrawProtocolFees(address to)",
  "function withdrawBuilderFees(address to)",
  "function createPool((uint64 deadline,uint64 revealDeadline,uint64 sentinelRevealDeadline,uint32 maxEntries,uint32 minEntries,uint96 entryPrice,uint16 builderFeeBps,uint16 protocolFeeBps,bytes32 creatorCommitHash,uint96 creatorBond,address sentinel,bytes32 sentinelCommitHash,uint96 sentinelBond,address builderFeeRecipient) cp) returns (uint256)"
] as const;
