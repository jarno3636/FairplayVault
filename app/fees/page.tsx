'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useVault } from '@/hooks/useVault'
import toast from 'react-hot-toast'

export default function FeesPage() {
  const { address } = useAccount()
  const { withdrawProtocolFees, withdrawBuilderFees } = useVault()
  const [busy, setBusy] = useState(false)

  async function doWithdraw(kind: 'protocol'|'builder') {
    if (!address) return toast.error('Connect wallet')
    setBusy(true)
    try {
      if (kind === 'protocol') await withdrawProtocolFees(address)
      else await withdrawBuilderFees(address)
      toast.success('Withdrawn')
    } catch (e:any) {
      toast.error(e.message || String(e))
    } finally { setBusy(false) }
  }

  return (
    <main className="space-y-4">
      <div className="card"><h1>Withdraw Fees</h1><p className="text-slate-400">Withdraw fees accrued for your address.</p></div>
      <div className="card flex gap-2">
        <button className="btn" onClick={() => doWithdraw('builder')} disabled={busy}>Withdraw Builder Fees</button>
        <button className="btn-secondary" onClick={() => doWithdraw('protocol')} disabled={busy}>Withdraw Protocol Fees</button>
      </div>
      <div className="text-sm text-slate-500">Note: You must be the configured recipient for each fee type.</div>
    </main>
  )
}
