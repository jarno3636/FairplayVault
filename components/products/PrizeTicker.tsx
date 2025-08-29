'use client'

import { useEffect, useRef, useState } from 'react'

export default function PrizeTicker({
  to, prefix = '$', durationMs = 900
}: { to: number; prefix?: string; durationMs?: number }) {
  const [val, setVal] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const begin = 0
    const change = to - begin
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setVal(Math.round((begin + change * eased) * 100) / 100)
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [to, durationMs])
  return (
    <span className="tabular-nums font-semibold">
      {prefix}{val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}
