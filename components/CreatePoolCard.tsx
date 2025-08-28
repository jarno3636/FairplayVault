'use client'

import { useState } from 'react'
import { Address } from 'viem'
import { useAccount } from 'wagmi'
import { useVault, type CreateParams } from '@/hooks/useVault'
import { commitOf, randomSalt32 } from '@/lib/utils'
import ApproveAndCall from './ApproveAndCall'
import { env } from '@/lib/env'
import axios from 'axios'
import toast from 'react-hot-toast'
import { encryptText } from '@/lib/crypto'

export default function CreatePoolCard() {
  const { address } = useAccount()
  const { createPool } = useVault()
  const [entry, setEntry] = useState('1.00')
  const [minEntries, setMinEntries] = useState(0)
  const [maxEntries, setMaxEntries] = useState(0)
  const [builderFeeBps, setBfbps] = useState(200)
  const [protocolFeeBps, setPfbps] = useState(100)
  const [bond, setBond] = useState('50.00')
  const [creatorSalt, setCreatorSalt] = useState<`0x${string}`>(randomSalt32())
  const [deadlineMin, setDeadlineMin] = useState(30)
  const [revealMin, setRevealMin] = useState(10)

  // Sentinel options
  const [useSentinel, setUseSentinel] = useState(false)
  const [sentinelBond, setSentinelBond] = useState('5.00')
  const [sentinelDeadlineMin, setSentinelDeadlineMin] = useState(20)
  const [sentinelAddress, setSentinelAddress] = useState<Address | ''>('')
  const [sentinelCommitHash, setSentinelCommitHash] = useState<`0x${string}` | ''>('')

  const [busy, setBusy] = useState(false)
  const [lastPoolId, setLastPoolId] = useState<bigint | null>(null)
  const usdc = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address

  const entryPrice = BigInt(Math.round(parseFloat(entry || '0') * 1_000_000))
  const creatorBond = BigInt(Math.round(parseFloat(bond || '0') * 1_000_000))
  const sentinelBondRaw = BigInt(Math.round(parseFloat(sentinelBond || '0') * 1_000_000))

  async function fetchSentinelCommit() {
    if (!env.sentinelUrl) { toast.error('Set NEXT_PUBLIC_SENTINEL_URL'); return }
    try {
      const { data } = await axios.get(env.sentinelUrl + '/commit', { timeout: 10_000 })
      setSentinelAddress(data.sentinelAddress as Address)
      setSentinelCommitHash(data.sentinelCommitHash as `0x${string}`)
      toast.success('Got sentinel commit')
    } catch (e:any) {
      toast.error('Sentinel /commit failed: ' + (e.message || 'error'))
    }
  }

  async function doCreate() {
    setBusy(true)
    try {
      const now = Math.floor(Date.now()/1000)
      const deadline = BigInt(now + deadlineMin*60)
      const revealDeadline = BigInt(now + (deadlineMin+revealMin)*60)
      const sentinelRevealDeadline = useSentinel ? BigInt(now + (deadlineMin+sentinelDeadlineMin)*60) : 0n

      // Encrypt creator salt with a passphrase prompt (optional)
      const pass = window.prompt('Optional: Set a passphrase to encrypt your creator salt (leave empty to store raw).') || ''
      const saltToStore = pass ? await encryptText(pass, creatorSalt) : creatorSalt
      localStorage.setItem(`creatorSalt:${(Number(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(creatorSalt))).toString())}`, 'dummy') // keep code path consistent
      // Store by pool later (after tx) as well

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
        sentinel: useSentinel ? (sentinelAddress || '0x0000000000000000000000000000000000000000') as Address : '0x0000000000000000000000000000000000000000',
        sentinelCommitHash: useSentinel ? (sentinelCommitHash as any) : ('0x' + '0'.repeat(64) as any),
        sentinelBond: useSentinel ? sentinelBondRaw : 0n,
        builderFeeRecipient: (address || '0x0000000000000000000000000000000000000000') as Address
      }
      const { poolId } = await createPool(cp)

      // Persist salt (encrypted or raw) by poolId
      localStorage.setItem(`creatorSalt:${poolId.toString()}`, saltToStore as string)
      toast.success(`Pool #${poolId.toString()} created`)
      setLastPoolId(poolId)
    } catch (e:any) {
      toast.error(e.message || String(e))
    } finally { setBusy(false) }
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

      <div className="grid grid-cols-2 gap-3">
        <div><div className="label">Entry price (USDC)</div><input className="input" value={entry} onChange={e=>setEntry(e.target.value)} /></div>
        <div><div className="label">Creator bond (USDC)</div><input className="input" value={bond} onChange={e=>setBond(e.target.value)} /></div>
        <div><div className="label">Min entries (0 = none)</div><input className="input" value={minEntries} onChange={e=>setMinEntries(Number(e.target.value||0))} /></div>
        <div><div className="label">Max entries (0 = unlimited)</div><input className="input" value={maxEntries} onChange={e=>setMaxEntries(Number(e.target.value||0))} /></div>
        <div><div className="label">Builder fee (bps)</div><input className="input" value={builderFeeBps} onChange={e=>setBfbps(Number(e.target.value||200))} /></div>
        <div><div className="label">Protocol fee (bps)</div><input className="input" value={protocolFeeBps} onChange={e=>setPfbps(Number(e.target.value||100))} /></div>
        <div><div className="label">Entry window (minutes)</div><input className="input" value={deadlineMin} onChange={e=>setDeadlineMin(Number(e.target.value||30))} /></div>
        <div><div className="label">Reveal window after (minutes)</div><input className="input" value={revealMin} onChange={e=>setRevealMin(Number(e.target.value||10))} /></div>
      </div>

      {useSentinel && (
        <div className="card bg-slate-900/60 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><div className="label">Sentinel reveal after (min, from now)</div><input className="input" value={sentinelDeadlineMin} onChange={e=>setSentinelDeadlineMin(Number(e.target.value||20))} /></div>
            <div><div className="label">Sentinel bond (USDC)</div><input className="input" value={sentinelBond} onChange={e=>setSentinelBond(e.target.value)} /></div>
            <div className="col-span-2"><div className="label">Sentinel address</div><input className="input" value={sentinelAddress} onChange={e=>setSentinelAddress(e.target.value as any)} placeholder="0x..." /></div>
            <div className="col-span-2"><div className="label">Sentinel commit hash</div><input className="input" value={sentinelCommitHash} onChange={e=>setSentinelCommitHash(e.target.value as any)} placeholder="0x..." /></div>
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={fetchSentinelCommit}>Fetch from sentinel /commit</button>
            <div className="text-sm text-slate-400">Env: NEXT_PUBLIC_SENTINEL_URL</div>
          </div>
        </div>
      )}

      <div className="col-span-2">
        <div className="label">Creator salt (keep safely!)</div>
        <input className="input" value={creatorSalt} onChange={e=>setCreatorSalt(e.target.value as any)} />
      </div>

      <div className="flex gap-2">
        <ApproveAndCall token={'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address} spender={env.vault as Address} amount={creatorBond + (useSentinel ? sentinelBondRaw : 0n)} onApproveDone={() => doCreate()} className="btn" />
        <button className="btn-secondary" onClick={doCreate} disabled={busy}>Create (I already approved)</button>
      </div>

      {lastPoolId && (<div className="text-sm text-emerald-400">Created pool #{lastPoolId.toString()} — salt stored locally under <code>creatorSalt:{lastPoolId.toString()}</code></div>)}
    </div>
  )
}
