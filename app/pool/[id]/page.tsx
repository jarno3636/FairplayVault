'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { Address, Hex } from 'viem'
import { useParams } from 'next/navigation'
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useChainId,
} from 'wagmi'
import toast from 'react-hot-toast'

import { env } from '@/lib/env'
import { FAIRPLAY_VAULT_ABI } from '@/lib/abi/FairplayVault'
import ApproveAndCall from '@/components/ApproveAndCall'
import { formatTs, formatUsd } from '@/lib/utils'

const abi = FAIRPLAY_VAULT_ABI
const VAULT = env.vault as Address
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address // Base USDC
const BASE_CHAIN_ID = 8453

// ---------- types ----------
type PoolTuple = [
  creator: Address,
  builderFeeRecipient: Address,
  deadline: bigint,                // uint64
  revealDeadline: bigint,          // uint64
  sentinelRevealDeadline: bigint,  // uint64
  maxEntries: number,              // uint32
  minEntries: number,              // uint32
  entryPrice: bigint,              // uint96
  builderFeeBps: number,           // uint16
  protocolFeeBps: number,          // uint16
  creatorCommitHash: Hex,
  sentinelCommitHash: Hex,
  sentinel: Address,
  creatorBond: bigint,             // uint96
  sentinelBond: bigint,            // uint96
  entries: number,                 // uint32
  creatorRevealed: boolean,
  sentinelRevealed: boolean,
  drawn: boolean,
  canceled: boolean,
  winner: Address,
  _creatorSalt: Hex,
  _sentinelSalt: Hex,
  grossCollected: bigint           // uint128
]

// ---------- small helpers ----------
function useNow(tickMs = 1000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), tickMs)
    return () => clearInterval(id)
  }, [tickMs])
  return now
}

function pct(n: number, d: number) {
  if (!d) return 0
  return Math.max(0, Math.min(100, Math.round((n / d) * 100)))
}

function fmtCountdown(now: number, target: number) {
  const s = Math.max(0, target - now)
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return `${hh}h ${mm}m ${ss}s`
}

function copy(str: string) {
  navigator.clipboard.writeText(str).then(
    () => toast.success('Link copied'),
    () => toast.error('Copy failed'),
  )
}

// ---------- page ----------
export default function PoolDetail() {
  // params
  const params = useParams() as { id?: string | string[] } | null
  const idParam = params?.id
  const idStr = Array.isArray(idParam) ? idParam[0] : idParam
  if (!idStr) return <div className="card">Invalid pool id.</div>
  let poolId: bigint
  try {
    poolId = BigInt(idStr)
  } catch {
    return <div className="card">Invalid pool id.</div>
  }

  // chain & clients
  const chainId = useChainId()
  const pub = usePublicClient()
  const { data: wallet } = useWalletClient()
  const { address, isConnected } = useAccount()
  const now = useNow(1000)

  // state
  const [pool, setPool] = useState<PoolTuple | null>(null)
  const [prizes, setPrizes] = useState<[bigint, bigint, bigint] | null>(null)
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [myEntries, setMyEntries] = useState<number>(0)
  const errorShownRef = useRef(false)

  const refresh = useCallback(async () => {
    if (!pub) return
    try {
      setLoading(true)
      const [p, pv] = await Promise.all([
        pub.readContract({
          address: VAULT,
          abi,
          functionName: 'pools',
          args: [poolId],
        }) as Promise<PoolTuple>,
        pub.readContract({
          address: VAULT,
          abi,
          functionName: 'prizePreview',
          args: [poolId],
        }) as Promise<[bigint, bigint, bigint]>,
      ])
      setPool(p)
      setPrizes(pv)
      errorShownRef.current = false
    } catch (e: any) {
      if (!errorShownRef.current) {
        toast.error(e?.shortMessage || e?.message || 'Failed to load pool')
        errorShownRef.current = true
      }
    } finally {
      setLoading(false)
    }
  }, [pub, poolId])

  // initial + whenever pub changes
  useEffect(() => {
    refresh().catch(() => {})
  }, [refresh])

  // live events
  useEffect(() => {
    if (!pub) return
    const unsubs = [
      pub.watchContractEvent({
        address: VAULT, abi, eventName: 'Entered',
        args: { poolId },
        onLogs: () => refresh().catch(() => {}),
      }),
      pub.watchContractEvent({
        address: VAULT, abi, eventName: 'CreatorRevealed',
        args: { poolId },
        onLogs: () => { toast.success('Creator revealed'); refresh().catch(() => {}) },
      }),
      pub.watchContractEvent({
        address: VAULT, abi, eventName: 'SentinelRevealed',
        args: { poolId },
        onLogs: () => { toast.success('Sentinel revealed'); refresh().catch(() => {}) },
      }),
      pub.watchContractEvent({
        address: VAULT, abi, eventName: 'RandomnessResolved',
        args: { poolId },
        onLogs: () => { toast.success('Winner drawn'); refresh().catch(() => {}) },
      }),
    ]
    return () => { unsubs.forEach(u => u?.()) }
  }, [pub, poolId, refresh])

  // my entries (premium touch)
  useEffect(() => {
    if (!pub || !isConnected || !address) { setMyEntries(0); return }
    ;(async () => {
      try {
        // Filter Entered logs for this pool and user
        const logs = await pub.getLogs({
          address: VAULT,
          event: {
            type: 'event',
            name: 'Entered',
            inputs: [
              { indexed: true, name: 'poolId', type: 'uint256' },
              { indexed: true, name: 'user', type: 'address' },
              { indexed: false, name: 'quantity', type: 'uint32' },
              { indexed: false, name: 'amount', type: 'uint256' },
            ],
          } as any,
          args: { poolId, user: address },
          fromBlock: 0n,
          toBlock: 'latest',
        })
        // sum quantities
        let sum = 0
        for (const l of logs) {
          const q = (l as any).args?.quantity as number | undefined
          if (typeof q === 'number') sum += q
        }
        setMyEntries(sum)
      } catch {
        // non-fatal
      }
    })()
  }, [pub, address, isConnected, poolId])

  // derived
  const entryPrice = useMemo(() => pool ? pool[7] : 0n, [pool]) // entryPrice
  const deadline = useMemo(() => pool ? Number(pool[2]) : 0, [pool])
  const revealDeadline = useMemo(() => pool ? Number(pool[3]) : 0, [pool])
  const drawn = useMemo(() => pool ? pool[18] : false, [pool])
  const canceled = useMemo(() => pool ? pool[19] : false, [pool])
  const maxEntries = useMemo(() => pool ? pool[5] : 0, [pool])
  const currentEntries = useMemo(() => pool ? pool[15] : 0, [pool])
  const remainingSlots = useMemo(() => Math.max(0, maxEntries - currentEntries), [maxEntries, currentEntries])
  const progress = pct(currentEntries, maxEntries)
  const afterDeadline = now >= deadline
  const beforeReveal = now < revealDeadline
  const totalCost = useMemo(() => entryPrice * BigInt(qty), [entryPrice, qty])

  // clamp qty when remainingSlots changes
  useEffect(() => {
    setQty(q => Math.min(Math.max(1, q), Math.max(1, remainingSlots || 1)))
  }, [remainingSlots])

  // actions
  const ensureBase = async () => {
    if (chainId === BASE_CHAIN_ID) return true
    if (!wallet?.switchChain) {
      toast.error('Wrong network. Please switch to Base.')
      return false
    }
    try {
      await wallet.switchChain({ id: BASE_CHAIN_ID })
      toast.success('Switched to Base')
      return true
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || 'Switch failed')
      return false
    }
  }

  async function enter() {
    if (!pub) return toast.error('Network not ready')
    if (!wallet) return toast.error('Connect wallet')
    if (!(await ensureBase())) return
    if (qty < 1) return toast.error('Quantity must be at least 1')
    if (qty > remainingSlots) return toast.error('Not enough slots remaining')
    if (afterDeadline) return toast.error('Deadline has passed')
    if (drawn || canceled) return toast.error('Pool is closed')

    setBusy(true)
    try {
      const sim = await pub.simulateContract({
        address: VAULT, abi, functionName: 'enter',
        args: [poolId, qty], account: wallet.account!,
      })
      const hash = await wallet.writeContract(sim.request)
      await pub.waitForTransactionReceipt({ hash })
      toast.success('Entered the pool!')
      await refresh()
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || 'Transaction failed')
    } finally {
      setBusy(false)
    }
  }

  async function reveal() {
    if (!pub) return toast.error('Network not ready')
    if (!wallet) return toast.error('Connect wallet')
    if (!(await ensureBase())) return

    const raw = localStorage.getItem(`creatorSalt:${poolId.toString()}`) as string | null
    if (!raw) return toast.error('No local salt found for this pool on this device.')

    let salt: Hex = raw as Hex
    if (!raw.startsWith('0x')) {
      const pass = window.prompt('Enter passphrase to decrypt your creator salt') || ''
      const mod = await import('@/lib/crypto')
      try {
        salt = await (mod as any).decryptText(pass, raw)
      } catch {
        return toast.error('Bad passphrase or corrupted payload')
      }
    }

    setBusy(true)
    try {
      const sim = await pub.simulateContract({
        address: VAULT, abi, functionName: 'revealCreator',
        args: [poolId, salt], account: wallet.account!,
      })
      const hash = await wallet.writeContract(sim.request)
      await pub.waitForTransactionReceipt({ hash })
      toast.success('Reveal submitted')
      await refresh()
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || 'Reveal failed')
    } finally {
      setBusy(false)
    }
  }

  async function finalize() {
    if (!pub) return toast.error('Network not ready')
    if (!wallet) return toast.error('Connect wallet')
    if (!(await ensureBase())) return

    setBusy(true)
    try {
      const sim = await pub.simulateContract({
        address: VAULT, abi, functionName: 'finalizeAfterDeadlines',
        args: [poolId], account: wallet.account!,
      })
      const hash = await wallet.writeContract(sim.request)
      await pub.waitForTransactionReceipt({ hash })
      toast.success('Finalized')
      await refresh()
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || 'Finalize failed')
    } finally {
      setBusy(false)
    }
  }

  // UI skeletons
  if (!pub) return <div className="card">Connecting to network…</div>
  if (loading || !pool) {
    return (
      <main className="space-y-4">
        <div className="card animate-pulse h-40" />
        <div className="card animate-pulse h-36" />
        <div className="card animate-pulse h-32" />
      </main>
    )
  }

  const shareUrl = typeof window !== 'undefined'
    ? window.location.href
    : `${process.env.NEXT_PUBLIC_SITE_URL}/pool/${idStr}`

  const isCreator = address && pool[0]?.toLowerCase() === address.toLowerCase()
  const isSentinel = address && pool[12]?.toLowerCase() === address.toLowerCase()
  const isWinner = address && pool[20] && pool[20].toLowerCase() === address.toLowerCase()

  return (
    <main className="space-y-4">
      {/* header card */}
      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold">Pool #{idStr}</div>
            {chainId !== BASE_CHAIN_ID ? (
              <span className="rounded-full px-2 py-0.5 text-xs bg-rose-500/20 text-rose-300">Wrong Network</span>
            ) : (
              <span className="rounded-full px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300">Base</span>
            )}
            {isCreator && <RoleBadge>Creator</RoleBadge>}
            {isSentinel && <RoleBadge>Sentinel</RoleBadge>}
            {isWinner && <RoleBadge>Winner</RoleBadge>}
            {isConnected && myEntries > 0 && (
              <span className="rounded-full px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300">
                My entries: {myEntries}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <button
              className="link"
              onClick={() => {
                if ((navigator as any).share) {
                  (navigator as any).share({ title: `Pool #${idStr}`, url: shareUrl }).catch(() => copy(shareUrl))
                } else {
                  copy(shareUrl)
                }
              }}
            >
              Share
            </button>
            <a
              className="link"
              href={`${process.env.NEXT_PUBLIC_EXPLORER || 'https://basescan.org'}/address/${VAULT}`}
              target="_blank"
            >
              Vault
            </a>
            <a
              className="link"
              href={`${process.env.NEXT_PUBLIC_EXPLORER || 'https://basescan.org'}/token/${USDC}`}
              target="_blank"
            >
              USDC
            </a>
          </div>
        </div>

        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <KV label="Deadline" value={`${formatTs(Number(pool[2]))} • ${fmtCountdown(now, Number(pool[2]))}`} />
          <KV label="Reveal by" value={`${formatTs(Number(pool[3]))} • ${fmtCountdown(now, Number(pool[3]))}`} />
          <KV label="Entries" value={`${currentEntries} / ${maxEntries}`} />
          <KV label="Entry price" value={formatUsd(entryPrice)} />
        </div>

        {/* progress bar */}
        <div className="mt-3 h-2 w-full rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-white/60"
            style={{ width: `${progress}%` }}
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        {prizes && (
          <div className="mt-3 text-slate-300 text-sm">
            Prize {formatUsd(prizes[0])} • Builder fee {formatUsd(prizes[1])} • Protocol fee {formatUsd(prizes[2])}
          </div>
        )}

        {(drawn || canceled) && (
          <div className="mt-3 text-rose-400 text-sm">
            {canceled ? 'Pool canceled.' : 'Winner already drawn.'}
          </div>
        )}
      </div>

      {/* enter card */}
      <div className="card space-y-3">
        <h2>Enter</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <div className="text-slate-400 text-xs">Quantity</div>
            <input
              className="input max-w-[140px]"
              type="number"
              min={1}
              max={Math.max(1, remainingSlots)}
              value={qty}
              onChange={(e) => {
                const v = Math.floor(Number(e.target.value || 1))
                setQty(isFinite(v) ? Math.min(Math.max(1, v), Math.max(1, remainingSlots)) : 1)
              }}
            />
            <div className="text-xs text-slate-400">Remaining: {remainingSlots}</div>
          </div>

          <div className="space-y-1">
            <div className="text-slate-400 text-xs">Total</div>
            <div className="font-medium">{formatUsd(totalCost)}</div>
          </div>

          <div className="flex-1" />

          <ApproveAndCall token={USDC} spender={VAULT} amount={totalCost} />

          <button
            className="btn-secondary"
            onClick={enter}
            disabled={
              busy || !isConnected || canceled || drawn || afterDeadline || qty < 1 || qty > remainingSlots
            }
            title={
              !isConnected ? 'Connect wallet'
              : afterDeadline ? 'Deadline passed'
              : drawn ? 'Already drawn'
              : canceled ? 'Canceled'
              : qty > remainingSlots ? 'Not enough slots'
              : undefined
            }
          >
            Enter now
          </button>
        </div>
        {chainId !== BASE_CHAIN_ID && (
          <div className="text-xs text-rose-300">You’re on the wrong network — switch to Base to participate.</div>
        )}
      </div>

      {/* reveal/finalize card */}
      <div className="card space-y-3">
        <h2>Reveal / Finalize</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn"
            onClick={reveal}
            disabled={busy || !isConnected || beforeReveal}
            title={beforeReveal ? 'Reveal window not open yet' : undefined}
          >
            Reveal (creator)
          </button>
          <button
            className="btn-secondary"
            onClick={finalize}
            disabled={busy || !isConnected}
          >
            Finalize after deadlines
          </button>
        </div>
        <div className="text-sm text-slate-400">
          Reveals require your creator salt stored on this device. If it was encrypted, you’ll be asked for your passphrase.
        </div>
      </div>
    </main>
  )
}

// --- tiny presentational helpers ---
function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-slate-400 text-sm">{label}</div>
      <div>{value}</div>
    </div>
  )
}

function RoleBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-xs bg-white/15 text-white/90 border border-white/20">
      {children}
    </span>
  )
}
