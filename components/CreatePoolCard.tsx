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
import Tooltip from '@/components/Tooltip'

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
  const [formError, setFormError] = useState<string | null>(null)

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
    if (!isConnected || !address) return 'Connect your wallet to continue.'
    if (entryPrice <= 0n) return `Entry price must be greater than 0 ${symbol}.`
    if (creatorBond < 0n) return `Creator bond must be ≥ 0 ${symbol}.`
    if (useSentinel && sentinelBondRaw < 0n) return `Sentinel bond must be ≥ 0 ${symbol}.`
    if (minEntries < 0 || maxEntries < 0) return 'Entry counts cannot be negative.'
    if (maxEntries !== 0 && minEntries > maxEntries) return 'Min entries cannot exceed max.'
    if (builderFeeBps < 0 || builderFeeBps > MAX_BPS) return 'Builder fee (bps) must be 0–10000.'
    if (protocolFeeBps < 0 || protocolFeeBps > MAX_BPS) return 'Protocol fee (bps) must be 0–10000.'
    if (deadlineMin < 1) return 'Entry window must be at least 1 minute.'
    if (revealMin < 1) return 'Reveal window must be at least 1 minute.'
    if (useSentinel) {
      if (!sentinelAddress || !/^0x[0-9a-fA-F]{40}$/.test(sentinelAddress)) return 'Sentinel address is invalid.'
      if (!sentinelCommitHash || !/^0x[0-9a-fA-F]{64}$/.test(sentinelCommitHash)) return 'Sentinel commit hash is invalid.'
      if (sentinelDeadlineMin < 1) return 'Sentinel reveal window must be at least 1 minute.'
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
    } catch { /* best effort */ }
  }

  function applyPreset(kind: 'low'|'standard'|'high') {
    if (kind === 'low') {
      setEntry('0.50'); setBond('10'); setBfbps(100); setPfbps(50); setDeadlineMin(20); setRevealMin(5)
    } else if (kind === 'standard') {
      setEntry('1.00'); setBond('50'); setBfbps(200); setPfbps(100); setDeadlineMin(30); setRevealMin(10)
    } else {
      setEntry('5.00'); setBond('100'); setBfbps(250); setPfbps(150); setDeadlineMin(60); setRevealMin(15)
    }
  }

  async function doCreate() {
    const v = validate()
    setFormError(v)
    if (v) return
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

      localStorage.setItem(`creatorSalt:${poolId.toString()}`, saltToStore as string)
      toast.success(`Pool #${poolId.toString()} created`)
      setLastPoolId(poolId)
      downloadSaltBackup(poolId, saltToStore as string)
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card space-y-5">
      {/* Top row: title + network badge + presets */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Create a Pool</h2>
          <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs text-cyan-300 ring-1 ring-cyan-500/30">
            Network: {chainId === BASE_CHAIN_ID ? 'Base' : 'Wrong network'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Quick presets:</span>
          <button className="btn-secondary px-3 py-1.5" onClick={() => applyPreset('low')}>Low</button>
          <button className="btn-secondary px-3 py-1.5" onClick={() => applyPreset('standard')}>Standard</button>
          <button className="btn-secondary px-3 py-1.5" onClick={() => applyPreset('high')}>High</button>
        </div>
      </div>

      {/* Inline form error (first issue) */}
      {formError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {formError}
        </div>
      )}

      {/* BASICS */}
      <Section title="Basics" hint="Core settings most pools need.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabeledInput
            label={<LabelWithTip text={`Entry price (${symbol})`} tip="What each user pays per entry." />}
            value={entry} onChange={setEntry} placeholder="e.g. 1.00"
          />
          <LabeledInput
            label={<LabelWithTip text={`Creator bond (${symbol})`} tip="A refundable bond you stake to deter spam. Returned unless you violate reveal rules." />}
            value={bond} onChange={setBond} placeholder="e.g. 50.00"
          />
          <LabeledNumber
            label={<LabelWithTip text="Min entries (0 = none)" tip="Pool must collect at least this many entries to be valid. Use 0 for no minimum." />}
            value={minEntries} onChange={setMinEntries} min={0}
          />
          <LabeledNumber
            label={<LabelWithTip text="Max entries (0 = unlimited)" tip="Cap entries to limit pool size. Use 0 for no cap." />}
            value={maxEntries} onChange={setMaxEntries} min={0}
          />
        </div>
      </Section>

      {/* WINDOWS */}
      <Section title="Windows" hint="Timing for entries and reveal.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <LabeledNumber
            label={<LabelWithTip text="Entry window (minutes)" tip="How long users can enter after creation." />}
            value={deadlineMin} onChange={v=>setDeadlineMin(Math.max(1, v))} min={1}
          />
          <LabeledNumber
            label={<LabelWithTip text="Reveal window (minutes)" tip="Extra time after entries close for you (creator) to reveal your salt." />}
            value={revealMin} onChange={v=>setRevealMin(Math.max(1, v))} min={1}
          />
          <LabeledNumber
            label={<LabelWithTip text="Sentinel reveal (minutes)" tip="If using a sentinel, how long they have (after entries close) to reveal." />}
            value={sentinelDeadlineMin} onChange={v=>setSentinelDeadlineMin(Math.max(1, v))} min={1}
          />
        </div>
      </Section>

      {/* FEES */}
      <Section title="Fees" hint="BPS = basis points (1% = 100 bps).">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabeledNumber
            label={<LabelWithTip text="Builder fee (bps)" tip="Goes to the builder address you specify. 200 bps = 2%." />}
            value={builderFeeBps} onChange={v=>setBfbps(clamp(v,0,MAX_BPS))} min={0} max={MAX_BPS}
          />
          <LabeledNumber
            label={<LabelWithTip text="Protocol fee (bps)" tip="Goes to the protocol. 100 bps = 1%." />}
            value={protocolFeeBps} onChange={v=>setPfbps(clamp(v,0,MAX_BPS))} min={0} max={MAX_BPS}
          />
        </div>
      </Section>

      {/* SENTINEL */}
      <div className="rounded-xl border border-white/10 p-4">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useSentinel} onChange={e=>setUseSentinel(e.target.checked)} />
          <span className="font-medium">Use sentinel (dual-commit)</span>
          <Tooltip content="Optional second commit that reveals after you; helps prove you didn’t bias the outcome.">
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs text-slate-200">i</span>
          </Tooltip>
        </label>

        {useSentinel && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabeledInput
              label={<LabelWithTip text={`Sentinel bond (${symbol})`} tip="Refundable bond from the sentinel; deters griefing." />}
              value={sentinelBond} onChange={setSentinelBond} placeholder="e.g. 5.00"
            />
            <LabeledInput
              label={<LabelWithTip text="Sentinel address" tip="Wallet of the sentinel who will reveal their salt." />}
              value={sentinelAddress} onChange={v=>setSentinelAddress(v as Address)} placeholder="0x..."
            />
            <LabeledInput
              label={<LabelWithTip text="Sentinel commit hash" tip="Hash of the sentinel’s secret salt." />}
              value={sentinelCommitHash} onChange={v=>setSentinelCommitHash(v as `0x${string}`)} placeholder="0x..."
              className="sm:col-span-2"
            />
            <button className="btn sm:col-span-2" onClick={fetchSentinelCommit}>Fetch from sentinel /commit</button>
            <div className="text-xs text-slate-400 sm:col-span-2">Env: NEXT_PUBLIC_SENTINEL_URL</div>
          </div>
        )}
      </div>

      {/* CREATOR SALT */}
      <Section title="Creator salt" hint="Keep this safe. You’ll need it to reveal.">
        <div>
          <div className="label">Your secret salt
            <Tooltip content="We hash this now (commit). After entries close, you reveal the raw salt to prove fairness.">
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs text-slate-200">i</span>
            </Tooltip>
          </div>
          <input className="input" value={creatorSalt} onChange={e=>setCreatorSalt(e.target.value as any)} />
          <div className="text-xs text-slate-400 mt-1">
            You’ll be offered optional encryption + a local backup file on creation.
          </div>
        </div>
      </Section>

      {/* COST SUMMARY */}
      <div className="rounded-lg border border-white/10 p-3 text-sm">
        <div className="flex flex-wrap gap-4">
          <span>Entry price: <b>{fmt(entryPrice)} {symbol}</b></span>
          <span>Creator bond: <b>{fmt(creatorBond)} {symbol}</b></span>
          {useSentinel && <span>Sentinel bond: <b>{fmt(sentinelBondRaw)} {symbol}</b></span>}
          <span>Total to approve: <b>{fmt(totalRequired)} {symbol}</b></span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="space-y-2">
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
        <div className="text-xs text-slate-400">
          Step 1: Approve lets the vault transfer your bond(s). Step 2: Create submits the pool.
        </div>
      </div>

      {lastPoolId && (
        <div className="text-sm text-emerald-400">
          Created pool #{lastPoolId.toString()} — salt stored locally under <code>creatorSalt:{lastPoolId.toString()}</code>.
        </div>
      )}
    </div>
  )
}

/* ---------- small presentational helpers ---------- */

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{title}</h3>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function LabelWithTip({ text, tip }: { text: string; tip: string }) {
  return (
    <span className="inline-flex items-center">
      <span className="label mb-0">{text}</span>
      <Tooltip content={tip} className="ml-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs text-slate-200">i</span>
      </Tooltip>
    </span>
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo))
}

function LabeledInput({
  label, value, onChange, placeholder, className = '',
}: { label: React.ReactNode; value: string | number | Address | `0x${string}` | ''; onChange: (v: any) => void; placeholder?: string; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1">{label}</div>
      <input className="input" value={value as any} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function LabeledNumber({
  label, value, onChange, min, max, className = '',
}: { label: React.ReactNode; value: number; onChange: (v: number) => void; min?: number; max?: number; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1">{label}</div>
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
