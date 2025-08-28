'use client'

import { useEffect, useState } from 'react'
import { Address, parseAbi } from 'viem'
import { usePublicClient } from 'wagmi'
import { env } from '@/lib/env'
import { FAIRPLAY_VAULT_ABI } from '@/lib/abi/FairplayVault'
import { formatTs, timeLeft, formatUsd } from '@/lib/utils'

const abi = parseAbi(FAIRPLAY_VAULT_ABI)

export default function PoolList() {
  const pub = usePublicClient()
  const [ids, setIds] = useState<bigint[]>([])
  const [pools, setPools] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      const nextId = await pub!.readContract({ address: env.vault as Address, abi, functionName: 'nextPoolId' }) as bigint
      const list: bigint[] = []
      for (let i = 1n; i < nextId; i++) list.push(i)
      setIds(list.reverse())
    })().catch(()=>{})
  }, [pub])

  useEffect(() => {
    (async () => {
      const ps: any[] = []
      for (const id of ids.slice(0, 18)) {
        const p = await pub!.readContract({ address: env.vault as Address, abi, functionName: 'pools', args: [id] })
        const preview = await pub!.readContract({ address: env.vault as Address, abi, functionName: 'prizePreview', args: [id] }) as any
        ps.push({ id, p, preview })
      }
      setPools(ps)
    })().catch(()=>{})
  }, [ids, pub])

  return (
    <div className="grid-cards">
      {pools.map(({ id, p, preview }) => {
        const deadline = Number(p[2]); const revealDeadline = Number(p[3]);
        const entries = Number(p[15]); const drawn = Boolean(p[18]); const canceled = Boolean(p[19]);
        const prize = preview[0] as bigint;
        return (
          <a key={id.toString()} href={`/pool/${id.toString()}`} className="card hover:scale-[1.01] transition">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold">Pool #{id.toString()}</div>
              {drawn ? <span className="badge">Drawn</span> : canceled ? <span className="badge">Canceled</span> : <span className="badge">Open</span>}
            </div>
            <div className="text-sm text-slate-400">Deadline: {formatTs(deadline)} ({timeLeft(deadline)} left)</div>
            <div className="text-sm text-slate-400">Reveal by: {formatTs(revealDeadline)}</div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-cyan-300">{formatUsd(prize)} prize</div>
              <div className="text-slate-400">{entries} entries</div>
            </div>
          </a>
        )
      })}
    </div>
  )
}
