'use client'

import { useEffect, useState } from 'react'

export default function CountdownBadge({ to }: { to: number /* unix seconds */ }) {
  const [left, setLeft] = useState(Math.max(0, to - Math.floor(Date.now()/1000)))
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, to - Math.floor(Date.now()/1000))), 1000)
    return () => clearInterval(t)
  }, [to])

  const m = Math.floor(left / 60)
  const s = left % 60
  const urgent = left > 0 && left <= 60

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ${
      urgent ? 'bg-red-500/15 text-red-200 ring-red-500/30 animate-pulse'
             : 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30'
    }`}>
      ⏳ {left === 0 ? 'Closed' : `${m}m ${s}s`}
    </span>
  )
}
