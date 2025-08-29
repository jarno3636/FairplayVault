'use client'

import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'

type Props = {
  // unix seconds
  target: number
  // optional: unix seconds the phase started (for progress bar)
  startedAt?: number
  className?: string
  showBar?: boolean
  label?: string // e.g. "Entries close in"
}

export default function Countdown({ target, startedAt, className, showBar = true, label }: Props) {
  const [now, setNow] = useState<number>(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  const remaining = Math.max(0, target - now)

  const { d, h, m, s } = useMemo(() => {
    let t = remaining
    const d = Math.floor(t / 86400); t -= d * 86400
    const h = Math.floor(t / 3600);  t -= h * 3600
    const m = Math.floor(t / 60);    t -= m * 60
    const s = t
    return { d, h, m, s }
  }, [remaining])

  const tone = remaining <= 60 ? 'danger' : remaining <= 600 ? 'warn' : 'ok'
  const color =
    tone === 'danger' ? 'text-rose-300 ring-rose-500/30 bg-rose-500/10' :
    tone === 'warn'   ? 'text-amber-300 ring-amber-500/30 bg-amber-500/10' :
                        'text-emerald-300 ring-emerald-500/30 bg-emerald-500/10'

  // progress (0–1) if startedAt provided
  const progress = useMemo(() => {
    if (!showBar || !startedAt || startedAt >= target) return 0
    const span = target - startedAt
    if (span <= 0) return 0
    return Math.min(1, Math.max(0, (now - startedAt) / span))
  }, [showBar, startedAt, target, now])

  return (
    <div className={clsx('inline-flex flex-col gap-1', className)}>
      {label && <div className="text-xs text-slate-400">{label}</div>}
      <div className={clsx(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1',
        color
      )}>
        <span className="font-medium">⏳</span>
        <TimePill v={d} unit="d" />
        <Sep />
        <TimePill v={h} unit="h" />
        <Sep />
        <TimePill v={m} unit="m" />
        <Sep />
        <TimePill v={s} unit="s" />
      </div>

      {showBar && startedAt && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={clsx(
              'h-full transition-[width] duration-1000',
              tone === 'danger' ? 'bg-rose-400' : tone === 'warn' ? 'bg-amber-400' : 'bg-emerald-400'
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

function TimePill({ v, unit }: { v: number; unit: string }) {
  return (
    <span className="tabular-nums">
      <b>{String(v).padStart(2, '0')}</b><span className="opacity-80 ml-0.5">{unit}</span>
    </span>
  )
}
function Sep() { return <span className="opacity-50">·</span> }
