export type PoolStatus = 'OPEN' | 'REVEAL' | 'FINALIZED' | 'CANCELED'

export default function StatusBadge({ status }: { status: PoolStatus }) {
  const map: Record<PoolStatus, string> = {
    OPEN: 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30',
    REVEAL: 'bg-cyan-500/15 text-cyan-200 ring-cyan-500/30',
    FINALIZED: 'bg-indigo-500/15 text-indigo-200 ring-indigo-500/30',
    CANCELED: 'bg-red-500/15 text-red-200 ring-red-500/30',
  }
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ${map[status]}`}>
      {status}
    </span>
  )
}
