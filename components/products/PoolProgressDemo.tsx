'use client'
import ProductCard from './ProductCard'
import PoolProgress from './PoolProgress'

const code = `// PoolProgress.tsx
'use client'
import { motion } from 'framer-motion'
export default function PoolProgress({ entries, target, showGoal = true }:{
  entries: number; target: number; showGoal?: boolean
}) {
  const pct = Math.max(0, Math.min(100, Math.round((entries / Math.max(1, target)) * 100)))
  const color = pct>=100?'bg-emerald-500':pct>=75?'bg-cyan-500':pct>=50?'bg-indigo-500':'bg-slate-600'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>Entries: <b className="text-slate-200">{entries}</b>{showGoal && \` / \${target}\`}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
        <div className={\`h-3 \${color}\`} style={{ width: \`\${pct}%\` }} />
      </div>
      <div className="mt-1 text-[11px] text-slate-500">{pct<100?'Filling…':'Target reached 🎉'}</div>
    </div>
  )
}`

export default function PoolProgressDemo() {
  return (
    <ProductCard
      title="Pool Progress"
      subtitle="Animated ‘filling’ tracker toward a target."
      demo={<PoolProgress entries={37} target={100} />}
      code={code}
    />
  )
}
