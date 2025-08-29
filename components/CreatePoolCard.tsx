'use client'

import { useMemo, useState } from 'react'
import { Address } from 'viem'
import { useAccount, useChainId, useWalletClient } from 'wagmi'
import axios from 'axios'
import toast from 'react-hot-toast'

import { useVault, type CreateParams } from '@/hooks/useVault'
import { env } from '@/lib/env'
import ApproveAndCall from './ApproveAndCall'
import { commitOf, randomSalt32 } from '@/lib/utils'
import { encryptText } from '@/lib/crypto'
import { useTokenMeta } from '@/hooks/useTokenMeta'

const USDC: Address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base USDC
const BASE_CHAIN_ID = 8453
const MAX_BPS = 10_000

export default function CreatePoolCard() {
  const chainId = useChainId()
  const { data: wallet } = useWalletClient()
  const { address, isConnected } = useAccount()
  const { createPool } = useVault()

  // token meta (decimals/symbol), cached app-wide
  const { symbol, decimals, parse: parseToken, format: fmt } = useTokenMeta(USDC, { symbol: 'USDC', decimals: 6 })

  // form state
  const [entry, setEntry] = useState('1.00')
  const [minEntries, setMinEntries] = useState(0)
  const [maxEntries, setMaxEntries] = useState(0)
  const [builderFeeBps, setBfbps] = useState(200)
  const [protocolFeeBps, setPfbps] = useState(100)
  const [bond, setBond] = useState('50.00')
  const [creatorSalt, setCreatorSalt] = useState<`0x${string}`>(randomSalt32())
  const [deadlineMin, setDeadlineMin] = useState(30)
  const [revealMin, setRevealMin] = useState(10)

  // sentinel (optional)
  const [useSentinel, setUseSentinel] = useState(false)
  const [sentinelBond, setSentinelBond] = useState('5.00')
  const [sentinelDeadlineMin, setSentinelDeadlineMin] = useState(20)
  const [sentinelAddress, setSentinelAddress] = useState<Address | ''>('')
  const [sentinelCommitHash, setSentinelCommitHash] = useState<`0x${string}` | ''>('')

  // ui
  const [busy, setBusy] = useState(false)
  const [lastPoolId, setLastPoolId] = useState<bigint | null>(null)

  // derived on-chain integers (safe parsing via hook)
  const entryPrice = useMemo(() => safeParse(entry, parseToken), [entry, parseToken])
  const creatorBond = useMemo(() => safeParse(bond, parseToken), [bond, parseToken])
  const sentinelBondRaw = useMemo(
    () => (useSentinel ? safeParse(sentinelBond, parseToken) : 0n),
    [useSentinel, sentinelBond, parseToken]
  )
  const totalRequired = useMemo(() => creatorBond + sentinelBondRaw, [creatorBond, sentinelBondRaw])

  function safeParse(v: string, parseFn: (s: string) => bigint) {
    if (!v || !Number.isFinite(Number(v))) return 0n
    try { return parseFn(v) } catch { return 0n }
  }

  async function ensureBase(): Promise<boolean> {
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

  function validate(): string | null {
    if (!isConnected || !address) return 'Connect wallet'
    if (entryPrice <= 0n) return `Entry price must be > 0 ${symbol}`
    if (creatorBond < 0n) return `Creator bond must be ≥ 0 ${symbol}`
    if (useSentinel && sentinelBondRaw < 0n) return `Sentinel bond must be ≥ 0 ${symbol}`
    if (minEntries < 0 || maxEntries < 0) return 'Entry counts cannot be negative'
    if (maxEntries !== 0 && minEntries > maxEntries) return 'Min entries cannot exceed max'
    if (builderFeeBps < 0 || builderFeeBps > MAX_BPS) return 'Builder fee BPS out of range (0–10000)'
    if (protocolFeeBps < 0 || protocolFeeBps > MAX_BPS) return 'Protocol fee BPS out of range (0–10000)'
    if (deadlineMin < 1) return 'Entry window must be at least 1 minute'
    if (revealMin < 1) return 'Reveal window must be at least 1 minute'
    if (useSentinel) {
      if (!sentinelAddress || !/^0x[0-9a-fA-F]{40}$/.test(sentinelAddress)) return 'Invalid sentinel address'
      if (!sentinelCommitHash || !/^0x[0-9a-fA-F]{64}$/.test(sentinelCommitHash)) return 'Invalid sentinel commit hash'
      if (sentinelDeadlineMin < 1) return 'Sentinel reveal window must be at least 1 minute'
    }
    return null
  }

  async function fetchSentinelCommit() {
    if (!env.sentinelUrl) {
      toast.error('Set NEXT_PUBLIC_SENTINEL_URL')
      return
    }
    try {
      const { data } = await axios.get(env.sentinelUrl + '/commit', { timeout: 10_000 })
      const addr = (data?.sentinelAddress || '') as string
      const hash = (data?.sentinelCommitHash || '') as string
      if (!/^0x[0-9a-fA-F]{40}$/.test(addr) || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
        throw new Error('Invalid commit payload from sentinel')
      }
      setSentinelAddress(addr as Address)
      setSentinelCommitHash(hash as `0x${string}`)
      toast.success('Got sentinel commit')
    } catch (e: any) {
      toast.error('Sentinel /commit failed: ' + (e?.message || 'error'))
    }
  }

  function downloadSaltBackup(poolId: bigint, encryptedOrRaw: string) {
    try {
      const blob = new Blob(
        [JSON.stringify({ poolId: poolId.toString(), creatorSalt: encryptedOrRaw }, null, 2)],
        { type: 'application/json' }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fairplay-creator-salt-${poolId.toString()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // best effort
    }
  }

  async function doCreate() {
    const v = validate()
    if (v) { toast.error(v); return }
    if (!(await ensureBase())) return

    setBusy(true)
    try {
      const now = Math.floor(Date.now()/1000)
      const deadline = BigInt(now + deadlineMin*60)
      const revealDeadline = BigInt(now + (deadlineMin+revealMin)*60)
      const sentinelRevealDeadline = useSentinel ? BigInt(now + (deadlineMin+sentinelDeadlineMin)*60) : 0n

      // Encrypt creator salt (optional)
      const pass = window.prompt('Optional: Set a passphrase to encrypt your creator salt (leave empty to store raw).') || ''
      const saltToStore = pass ? await encryptText(pass, creatorSalt) : creatorSalt

      const cp: CreateParams = {
        deadline,
        revealDeadline,
        sentinelRevealDeadline,
        maxEntries,
        minEntries,
        entryPrice,
        builderFeeBps,
        protocolFeeBps,
        creatorCommitHash: commitOf(creatorSalt),
        creatorBond,
        sentinel: useSentinel ? (sentinelAddress as Address) : ('0x0000000000000000000000000000000000000000' as Address),
        sentinelCommitHash: (useSentinel ? sentinelCommitHash : ('0x' + '0'.repeat(64))) as `0x${string}`,
        sentinelBond: useSentinel ? sentinelBondRaw : 0n,
        builderFeeRecipient: (address || '0x0000000000000000000000000000000000000000') as Address,
      }

      const { poolId } = await createPool(cp)

      // Persist salt (encrypted or raw) by poolId — single canonical key
      localStorage.setItem(`creatorSalt:${poolId.toString()}`, saltToStore as string)

      toast.success(`Pool #${poolId.toString()} created`)
      setLastPoolId(poolId)
      // Offer a local backup file
      downloadSaltBackup(poolId, saltToStore as string)
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2>Create Pool</h2>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useSentinel} onChange={e=>setUseSentinel(e.target.checked)} />
          Use sentinel (dual-commit)
        </label>
      </div>

      {/* Prices & fees */}
      <div className="grid grid-cols-2 gap-3">
        <LabeledInput label={`Entry price (${symbol})`} value={entry} onChange={setEntry} placeholder={`e.g. 1.00`} />
        <LabeledInput label={`Creator bond (${symbol})`} value={bond} onChange={setBond} placeholder={`e.g. 50.00`} />
        <LabeledNumber label="Min entries (0 = none)" value={minEntries} onChange={setMinEntries} min={0} />
        <LabeledNumber label="Max entries (0 = unlimited)" value={maxEntries} onChange={setMaxEntries} min={0} />
        <LabeledNumber label="Builder fee (bps)" value={builderFeeBps} onChange={v=>setBfbps(clamp(v,0,MAX_BPS))} min={0} max={MAX_BPS} />
        <LabeledNumber label="Protocol fee (bps)" value={protocolFeeBps} onChange={v=>setPfbps(clamp(v,0,MAX_BPS))} min={0} max={MAX_BPS} />
        <LabeledNumber label="Entry window (minutes)" value={deadlineMin} onChange={v=>setDeadlineMin(Math.max(1, v))} min={1} />
        <LabeledNumber label="Reveal window after (minutes)" value={revealMin} onChange={v=>setRevealMin(Math.max(1, v))} min={1} />
      </div>

      {/* Sentinel block */}
      {useSentinel && (
        <div className="card bg-slate-900/60 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <LabeledNumber label="Sentinel reveal after (min, from now)" value={sentinelDeadlineMin} onChange={v=>setSentinelDeadlineMin(Math.max(1, v))} min={1} />
            <LabeledInput label={`Sentinel bond (${symbol})`} value={sentinelBond} onChange={setSentinelBond} placeholder="e.g. 5.00" />
            <div className="col-span-2">
              <LabeledInput label="Sentinel address" value={sentinelAddress} onChange={v=>setSentinelAddress(v as Address)} placeholder="0x..." />
            </div>
            <div className="col-span-2">
              <LabeledInput label="Sentinel commit hash" value={sentinelCommitHash} onChange={v=>setSentinelCommitHash(v as `0x${string}`)} placeholder="0x..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={fetchSentinelCommit}>Fetch from sentinel /commit</button>
            <div className="text-sm text-slate-400">Env: NEXT_PUBLIC_SENTINEL_URL</div>
          </div>
        </div>
      )}

      {/* Creator salt */}
      <div className="col-span-2">
        <div className="label">Creator salt (keep safely!)</div>
        <input className="input" value={creatorSalt} onChange={e=>setCreatorSalt(e.target.value as any)} />
        <div className="text-xs text-slate-400 mt-1">
          Your salt is used to reveal after entries close. You can encrypt it with a passphrase on creation; we’ll also offer a local backup file.
        </div>
      </div>

      {/* Cost summary */}
      <div className="rounded-lg border border-white/10 p-3 text-sm">
        <div className="flex flex-wrap gap-4">
          <span>Entry price: <b>{fmt(entryPrice)} {symbol}</b></span>
          <span>Creator bond: <b>{fmt(creatorBond)} {symbol}</b></span>
          {useSentinel && <span>Sentinel bond: <b>{fmt(sentinelBondRaw)} {symbol}</b></span>}
          <span>Total to approve: <b>{fmt(totalRequired)} {symbol}</b></span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <ApproveAndCall
          token={USDC}
          spender={env.vault as Address}
          amount={totalRequired}
          onApproveDone={() => doCreate()}
          className="btn"
        />
        <button className="btn-secondary" onClick={doCreate} disabled={busy}>
          Create (I already approved)
        </button>
      </div>

      {lastPoolId && (
        <div className="text-sm text-emerald-400">
          Created pool #{lastPoolId.toString()} — salt stored locally under <code>creatorSalt:{lastPoolId.toString()}</code>.
        </div>
      )}
    </div>
  )
}

/* ---------- tiny presentational helpers ---------- */

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo))
}

function LabeledInput({
  label, value, onChange, placeholder,
}: { label: string; value: string | number | Address | `0x${string}` | ''; onChange: (v: any) => void; placeholder?: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <input className="input" value={value as any} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function LabeledNumber({
  label, value, onChange, min, max,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <div className="label">{label}</div>
      <input
        className="input"
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e)=>onChange(Number(e.target.value || 0))}
      />
    </div>
  )
}
