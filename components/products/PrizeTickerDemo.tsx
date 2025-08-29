'use client'
import ProductCard from './ProductCard'
import PrizeTicker from './PrizeTicker'

const code = `// PrizeTicker.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
export default function PrizeTicker({ to, prefix='$', durationMs=900 }:{
  to: number; prefix?: string; durationMs?: number
}) {
  const [val, setVal] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    const start = performance.now(), begin = 0, change = to - begin
    const step = (t:number) => {
      const p = Math.min(1, (t-start)/durationMs)
      const eased = 1 - Math.pow(1-p, 3)
      setVal(Math.round((begin + change * eased) * 100) / 100)
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [to, durationMs])
  return <span className="tabular-nums font-semibold">{prefix}{val.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
}`

export default function PrizeTickerDemo() {
  return (
    <ProductCard
      title="Prize Ticker"
      subtitle="Counts up to a prize or pot total."
      demo={<div className="text-2xl"><PrizeTicker to={12345.67} /></div>}
      code={code}
    />
  )
}
