'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Address, Abi } from 'viem'
import { usePublicClient } from 'wagmi'
import { env } from '@/lib/env'
import { FAIRPLAY_VAULT_ABI } from '@/lib/abi/FairplayVault'
import { formatTs, timeLeft, formatUsd } from '@/lib/utils'
import toast from 'react-hot-toast'

const abi: Abi = FAIRPLAY_VAULT_ABI as unknown as Abi
const VAULT = env.vault as Address

// types for pools(...) tuple
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
  creatorCommitHash: `0x${string}`,
  sentinelCommitHash: `0x${string}`,
  sentinel: Address,
  creatorBond: bigint,             // uint96
  sentinelBond: bigint,            // uint96
  entries: number,                 // uint32
  creatorRevealed: boolean,
  sentinelRevealed: boolean,
  drawn: boolean,
  canceled: boolean,
  winner: Address,
  _creatorSalt: `0x${string}`,
  _sentinelSalt: `0x${string}`,
  grossCollected: bigint           // uint128
]

type Row = {
  id: bigint
  pool: PoolTuple
  prize: bigint
}

type StatusFilter = 'all' | 'open' | 'drawn' | 'canceled'

export default function PoolList() {
  const pub = usePublicClient()
  const [nextId, setNextId] = useState<bigint | null>(null)

  // UI controls
  const [status, setStatus] = useState<StatusFilter>('all')
  const [query, setQuery] = useState<string>('')      // search by exact id
  const [page, setPage] = useState(1)
  const pageSize = 12

  // data
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [errShown, setErrShown] = useState(false)
  const mounted = useRef(true)

  // Compute id list (descending) with optional search filter
  const ids = useMemo(() => {
    if (!nextId) return [] as bigint[]
    const all: bigint[] = []
    for (let i = nextId - 1n; i >= 1n; i--) {
      all.push(i)
      if (i === 1n) break
    }
    if (!query.trim()) return all
    try {
      const q = BigInt(query.trim())
      return all.filter((id) => id === q)
    } catch {
      return [] // bad query
    }
  }, [nextId, query])

  // Status filter (applied after fetch per page)
  const filteredRows = useMemo(() => {
    if (status === 'all') return rows
    return rows.filter(({ pool }) => {
      if (status === 'open') return !pool[18] && !pool[19] // not drawn & not canceled
      if (status === 'drawn') return pool[18] === true
      if (status === 'canceled') return pool[19] === true
      return true
    })
  }, [rows, status])

  const pageCount = useMemo(() => Math.max(1, Math.ceil(ids.length / pageSize)), [ids.length])
  useEffect(() => {
    setPage(1) // reset on search or nextId change
  }, [ids.length])

  // Fetch nextPoolId once and on interval (20s)
  useEffect(() => {
    mounted.current = true
    if (!pub) return
    const load = async () => {
      try {
        const n = await pub.readContract({
          address: VAULT, abi, functionName: 'nextPoolId'
        }) as bigint
        if (mounted.current) setNextId(n)
      } catch (e: any) {
        if (!errShown) {
          toast.error(e?.shortMessage || e?.message || 'Failed to load nextPoolId')
          setErrShown(true)
        }
      }
    }
    load().catch(() => {})
    const id = setInterval(() => load().catch(() => {}), 20_000)
    return () => { mounted.current = false; clearInterval(id) }
  }, [pub, errShown])

  // Live refresh on key events
  useEffect(() => {
    if (!pub) return
    const unsub1 = pub.watchContractEvent({
      address: VAULT, abi, eventName: 'PoolCreated',
      onLogs: () => refreshPage().catch(() => {})
    })
    const unsub2 = pub.watchContractEvent({
      address: VAULT, abi, eventName: 'Entered',
      onLogs: () => refreshPage().catch(() => {})
    })
    const unsub3 = pub.watchContractEvent({
      address: VAULT, abi, eventName: 'RandomnessResolved',
      onLogs: () => refreshPage().catch(() => {})
    })
    return () => { unsub1?.(); unsub2?.(); unsub3?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pub, page, status, query])

  const refreshPage = useCallback(async () => {
    if (!pub) return
    const start = (page - 1) * pageSize
    const end = Math.min(ids.length, start + pageSize)
    const slice = ids.slice(start, end)

    if (slice.length === 0) {
      setRows([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Build multicall for pools + prizePreview
      const contracts = slice.flatMap((id) => ([
        {
          address: VAULT,
          abi,
          functionName: 'pools',
          args: [id] as const,
        },
        {
          address: VAULT,
          abi,
          functionName: 'prizePreview',
          args: [id] as const,
        }
      ]))

      const result = await pub.multicall({ contracts })

      const collated: Row[] = []
      for (let i = 0; i < slice.length; i++) {
        const poolsRes = result[2 * i]
        const prizeRes = result[2 * i + 1]
        if (poolsRes.status !== 'success' || prizeRes.status !== 'success') continue
        const pool = poolsRes.result as PoolTuple
        const [prize] = prizeRes.result as [bigint, bigint, bigint]
        collated.push({ id: slice[i], pool, prize })
      }

      // Always newest first (slice is already newest→oldest)
      setRows(collated)
      setErrShown(false)
    } catch (e: any) {
      if (!errShown) {
        toast.error(e?.shortMessage || e?.message || 'Failed to load pools')
        setErrShown(true)
      }
    } finally {
      setLoading(false)
    }
  }, [pub, ids, page, pageSize, errShown])

  // load on page/ids change
  useEffect(() => {
    refreshPage().catch(() => {})
  }, [refreshPage])

  return (
    <section className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <div className="text-slate-400 text-xs">Search by ID</div>
          <input
            className="input"
            placeholder="e.g. 42"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <div className="text-slate-400 text-xs">Status</div>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="drawn">Drawn</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
        <div className="flex-1" />
        <div className="space-y-1 text-right">
          <div className="text-slate-400 text-xs">Pages</div>
          <div className="inline-flex items-center gap-2">
            <button
              className="btn-ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ‹ Prev
            </button>
            <span className="text-sm">
              Page <b>{page}</b> / {pageCount}
            </span>
            <button
              className="btn-ghost"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid-cards">
          {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
            <div key={i} className="card animate-pulse h-32" />
          ))}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="card text-slate-400">No pools found.</div>
      ) : (
        <div className="grid-cards">
          {filteredRows.map(({ id, pool, prize }) => {
            const deadline = Number(pool[2])
            const revealDeadline = Number(pool[3])
            const entries = Number(pool[15])
            const drawn = Boolean(pool[18])
            const canceled = Boolean(pool[19])
            const statusBadge = canceled ? 'Canceled' : drawn ? 'Drawn' : 'Open'

            return (
              <a
                key={id.toString()}
                href={`/pool/${id.toString()}`}
                className="card hover:scale-[1.01] transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-semibold">Pool #{id.toString()}</div>
                  <span className={`badge ${canceled ? 'opacity-70' : ''}`}>{statusBadge}</span>
                </div>

                <div className="text-sm text-slate-400">
                  Deadline: {formatTs(deadline)} {(!drawn && !canceled) && (
                    <> ({timeLeft(deadline)} left)</>
                  )}
                </div>
                <div className="text-sm text-slate-400">
                  Reveal by: {formatTs(revealDeadline)}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-cyan-300">{formatUsd(prize)} prize</div>
                  <div className="text-slate-400">{entries} entries</div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </section>
  )
}
