'use client'

import { useEffect, useMemo, useState } from 'react'

export default function TimerStrip({
  start, end, label = 'Time left'
}: { start: number; end: number; label?: string }) {
  const nowS = () => Math.floor(Date.now()/1000)
  const [now, setNow] = useState(nowS())
  useEffect(() => { const t = setInterval(()=>setNow(nowS()), 1000); return () => clearInterval(t) }, [])
  const pct = useMemo(() => {
    const span = Math.max(1, end - start)
    const used = Math.min(span, Math.max(0, now - start))
    return Math.round((used / span) * 100)
  }, [now, start, end])
  const left = Math.max(0, end - now)
  const m = Math.floor(left/60), s = left%60
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{left === 0 ? '0:00' : `${m}:${String(s).padStart(2, '0')}`}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
        <div className="h-2 bg-cyan-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
