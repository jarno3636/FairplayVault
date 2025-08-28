'use client'

import { useEffect, useMemo, useState } from 'react'
import { Address, Hex, parseAbi } from 'viem'
import { useParams } from 'next/navigation'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { env } from '@/lib/env'
import { FAIRPLAY_VAULT_ABI } from '@/lib/abi/FairplayVault'
import ApproveAndCall from '@/components/ApproveAndCall'
import { formatTs, formatUsd } from '@/lib/utils'
import toast from 'react-hot-toast'

const abi = parseAbi(FAIRPLAY_VAULT_ABI)
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address

export default function PoolDetail() {
  // ----- FIX: handle null | string | string[] safely
  const params = useParams() as { id?: string | string[] } | null
  const idParam = params?.id
  const idStr = Array.isArray(idParam) ? idParam[0] : idParam
  if (!idStr) return <div className="card">Invalid pool id.</div>
  const poolId = BigInt(idStr)

  const pub = usePublicClient()
  const { data: wallet } = useWalletClient()
  const { address } = useAccount()

  const [pool, setPool] = useState<any | null>(null)
  const [prizes, setPrizes] = useState<[bigint, bigint, bigint] | null>(null)
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const p = await pub!.readContract({
      address: env.vault as Address,
      abi,
      functionName: 'pools',
      args: [poolId],
    })
    setPool(p)
    const pv = await pub!.readContract({
      address: env.vault as Address,
      abi,
      functionName: 'prizePreview',
      args: [poolId],
    }) as any
    setPrizes([pv[0], pv[1], pv[2]])
  }

  useEffect(() => { refresh().catch(() => {}) }, [pub, poolId])

  useEffect(() => {
    const unsubs = [
      pub!.watchContractEvent({ address: env.vault as Address, abi, eventName: 'Entered', onLogs: () => refresh().catch(() => {}) }),
      pub!.watchContractEvent({ address: env.vault as Address, abi, eventName: 'CreatorRevealed', onLogs: () => { toast.success('Creator revealed'); refresh().catch(() => {}) } }),
      pub!.watchContractEvent({ address: env.vault as Address, abi, eventName: 'SentinelRevealed', onLogs: () => { toast.success('Sentinel revealed'); refresh().catch(() => {}) } }),
      pub!.watchContractEvent({ address: env.vault as Address, abi, eventName: 'RandomnessResolved', onLogs: () => { toast.success('Winner drawn'); refresh().catch(() => {}) } }),
    ]
    return () => { unsubs.forEach(u => u?.()) }
  }, [pub])

  const entryPrice = useMemo(() => (pool ? (pool[8] as bigint) : 0n), [pool])
  const deadline = useMemo(() => (pool ? Number(pool[2]) : 0), [pool])
  const revealDeadline = useMemo(() => (pool ? Number(pool[3]) : 0), [pool])
  const drawn = useMemo(() => (pool ? Boolean(pool[18]) : false), [pool])
  const canceled = useMemo(() => (pool ? Boolean(pool[19]) : false), [pool])

  async function enter() {
    if (!wallet) return toast.error('Connect wallet')
    setBusy(true)
    try {
      const sim = await pub!.simulateContract({
        address: env.vault as Address, abi, functionName: 'enter',
        args: [poolId, qty], account: wallet.account!,
      })
      const hash = await wallet.writeContract(sim.request)
      await pub!.waitForTransactionReceipt({ hash })
      toast.success('Entered'); await refresh()
    } catch (e: any) { toast.error(e.message || String(e)) } finally { setBusy(false) }
  }

  async function reveal() {
    if (!wallet) return toast.error('Connect wallet')
    const raw = localStorage.getItem(`creatorSalt:${poolId.toString()}`) as string | null
    if (!raw) return toast.error('No local salt found for this pool on this device.')
    let salt: Hex = raw as Hex
    if (!raw.startsWith('0x')) {
      const pass = window.prompt('Enter passphrase to decrypt your creator salt') || ''
      const mod = await import('@/lib/crypto')
      try { salt = await (mod as any).decryptText(pass, raw) } catch { return toast.error('Bad passphrase or corrupted payload') }
    }
    setBusy(true)
    try {
      const sim = await pub!.simulateContract({
        address: env.vault as Address, abi, functionName: 'revealCreator',
        args: [poolId, salt], account: wallet.account!,
      })
      const hash = await wallet.writeContract(sim.request)
      await pub!.waitForTransactionReceipt({ hash })
      toast.success('Revealed'); await refresh()
    } catch (e: any) { toast.error(e.message || String(e)) } finally { setBusy(false) }
  }

  async function finalize() {
    if (!wallet) return toast.error('Connect wallet')
    setBusy(true)
    try {
      const sim = await pub!.simulateContract({
        address: env.vault as Address, abi, functionName: 'finalizeAfterDeadlines',
        args: [poolId], account: wallet.account!,
      })
      const hash = await wallet.writeContract(sim.request)
      await pub!.waitForTransactionReceipt({ hash })
      toast.success('Finalized'); await refresh()
    } catch (e: any) { toast.error(e.message || String(e)) } finally { setBusy(false) }
  }

  if (!pool) return <div className="card">Loading…</div>

  return (
    <main className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Pool #{idStr}</div>
          <a className="link text-sm" href={`${process.env.NEXT_PUBLIC_EXPLORER || 'https://basescan.org'}/address/${env.vault}`} target="_blank">View Vault</a>
        </div>
        <div className="mt-2 grid sm:grid-cols-2 gap-3">
          <div className="space-y-1"><div className="text-slate-400 text-sm">Deadline</div><div>{formatTs(Number(pool[2]))}</div></div>
          <div className="space-y-1"><div className="text-slate-400 text-sm">Reveal by</div><div>{formatTs(Number(pool[3]))}</div></div>
          <div className="space-y-1"><div className="text-slate-400 text-sm">Entries</div><div>{String(pool[15])}</div></div>
          <div className="space-y-1"><div className="text-slate-400 text-sm">Entry price</div><div>{formatUsd(entryPrice)}</div></div>
        </div>
        {prizes && (
          <div className="mt-3 text-slate-300 text-sm">
            Prize {formatUsd(prizes[0])} • Builder fee {formatUsd(prizes[1])} • Protocol fee {formatUsd(prizes[2])}
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <h2>Enter</h2>
        <div className="flex items-center gap-2">
          <input className="input max-w-[140px]" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value || 1))} />
          <ApproveAndCall token={USDC} spender={env.vault as Address} amount={entryPrice * BigInt(qty)} />
          <button className="btn-secondary" onClick={enter} disabled={busy || canceled || drawn || (Math.floor(Date.now() / 1000) >= deadline)}>Enter now</button>
        </div>
      </div>

      <div className="card space-y-3">
        <h2>Reveal / Finalize</h2>
        <div className="flex gap-2">
          <button className="btn" onClick={reveal} disabled={busy || (Math.floor(Date.now() / 1000) < revealDeadline)}>Reveal (creator)</button>
          <button className="btn-secondary" onClick={finalize} disabled={busy}>Finalize after deadlines</button>
        </div>
        <div className="text-sm text-slate-400">Reveals require the creator salt. If you encrypted it, you will be asked for your passphrase.</div>
      </div>
    </main>
  )
}
