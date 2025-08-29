import CopyCode from './CopyCode'

export default function ProductCard({
  title, subtitle, demo, code
}: {
  title: string
  subtitle?: string
  demo: React.ReactNode
  code: string
}) {
  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle && <div className="text-sm text-slate-400">{subtitle}</div>}
        </div>
        <CopyCode code={code} />
      </div>
      <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
        {demo}
      </div>
      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer select-none">Show code</summary>
        <pre className="mt-2 overflow-auto rounded-md bg-black/40 p-3 text-[11px] leading-relaxed">
{code}
        </pre>
      </details>
    </div>
  )
}
