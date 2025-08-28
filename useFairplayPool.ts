import { useCallback, useEffect, useMemo, useState } from "react";
import { Address, createPublicClient, http, parseAbi, Hex } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { base } from "viem/chains";

// ---- Minimal ABI (reads + writes we use)
const abi = parseAbi([
  "function pools(uint256) view returns (address creator,address builderFeeRecipient,uint64 deadline,uint64 revealDeadline,uint64 sentinelRevealDeadline,uint32 maxEntries,uint32 minEntries,uint96 entryPrice,uint16 builderFeeBps,uint16 protocolFeeBps,bytes32 creatorCommitHash,bytes32 sentinelCommitHash,address sentinel,uint96 creatorBond,uint96 sentinelBond,uint32 entries,bool creatorRevealed,bool sentinelRevealed,bool drawn,bool canceled,address winner,bytes32 _creatorSalt,bytes32 _sentinelSalt,uint128 grossCollected)",
  "function revealCreator(uint256 poolId, bytes32 salt) external",
  "function revealSentinel(uint256 poolId, bytes32 salt) external",
  "function finalizeAfterDeadlines(uint256 poolId) external",
]);

type PoolTuple = readonly [
  Address, Address, bigint, bigint, bigint, number, number, bigint,
  number, number, Hex, Hex, Address, bigint, bigint, number, boolean,
  boolean, boolean, boolean, Address, Hex, Hex, bigint
];

export function useFairplayPool(vaultAddress: Address, poolId: bigint) {
  const { address } = useAccount();
  const pub = usePublicClient();
  const { data: wallet } = useWalletClient();

  const [pool, setPool] = useState<PoolTuple | null>(null);
  const [nowTs, setNowTs] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setErr(null);
      const [p, blk] = await Promise.all([
        pub.readContract({ address: vaultAddress, abi, functionName: "pools", args: [poolId] }) as Promise<PoolTuple>,
        pub.getBlock({ blockTag: "latest" })
      ]);
      setPool(p);
      setNowTs(blk.timestamp ?? 0n);
    } catch (e:any) {
      setErr(e.message || "read error");
    }
  }, [pub, vaultAddress, poolId]);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 10_000); // refresh every 10s
    return () => clearInterval(t);
  }, [fetchAll]);

  const view = useMemo(() => {
    if (!pool) return null;
    const creator = pool[0];
    const deadline = pool[2];
    const revealDeadline = pool[3];
    const sentinelRevealDeadline = pool[4];
    const sentinelCommitHash = pool[11];
    const sentinel = pool[12];
    const creatorRevealed = pool[16];
    const sentinelRevealed = pool[17];
    const drawn = pool[18];
    const canceled = pool[19];
    const entries = pool[15];

    const hasSentinel = sentinelCommitHash !== "0x0000000000000000000000000000000000000000000000000000000000000000";
    const canRevealCreator = !drawn && !canceled && entries > 0 && nowTs >= deadline && nowTs <= revealDeadline && !creatorRevealed;
    const canRevealSentinel = hasSentinel && !drawn && !canceled && entries > 0 && nowTs >= deadline && nowTs <= sentinelRevealDeadline && !sentinelRevealed;
    const canFinalize = !drawn && !canceled && nowTs > revealDeadline && (!hasSentinel || nowTs > sentinelRevealDeadline);

    return {
      creator, deadline, revealDeadline, sentinelRevealDeadline, sentinel, hasSentinel,
      creatorRevealed, sentinelRevealed, drawn, canceled, entries,
      canRevealCreator, canRevealSentinel, canFinalize,
      nowTs
    };
  }, [pool, nowTs]);

  // ---- Actions
  const revealCreator = useCallback(async (saltBytes32: Hex) => {
    if (!wallet) throw new Error("No wallet");
    setLoading(true);
    try {
      const tx = await wallet.writeContract({
        address: vaultAddress,
        abi, functionName: "revealCreator",
        args: [poolId, saltBytes32],
      });
      await pub.waitForTransactionReceipt({ hash: tx });
      await fetchAll();
    } finally { setLoading(false); }
  }, [wallet, pub, vaultAddress, poolId, fetchAll]);

  const revealSentinel = useCallback(async (saltBytes32: Hex) => {
    if (!wallet) throw new Error("No wallet");
    setLoading(true);
    try {
      const tx = await wallet.writeContract({
        address: vaultAddress,
        abi, functionName: "revealSentinel",
        args: [poolId, saltBytes32],
      });
      await pub.waitForTransactionReceipt({ hash: tx });
      await fetchAll();
    } finally { setLoading(false); }
  }, [wallet, pub, vaultAddress, poolId, fetchAll]);

  const finalizeAfterDeadlines = useCallback(async () => {
    if (!wallet) throw new Error("No wallet");
    setLoading(true);
    try {
      const tx = await wallet.writeContract({
        address: vaultAddress,
        abi, functionName: "finalizeAfterDeadlines",
        args: [poolId],
      });
      await pub.waitForTransactionReceipt({ hash: tx });
      await fetchAll();
    } finally { setLoading(false); }
  }, [wallet, pub, vaultAddress, poolId, fetchAll]);

  return { pool, view, nowTs, loading, err, revealCreator, revealSentinel, finalizeAfterDeadlines, refresh: fetchAll };
}
