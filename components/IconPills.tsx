'use client'

import { Sparkles, Clock, Shield, Ticket, Binary } from 'lucide-react'

const pills = [
  { icon: Ticket,  label: 'USDC Pools', desc: 'Flat entry price' },
  { icon: Shield,  label: 'Commit–Reveal', desc: 'No VRF needed' },
  { icon: Clock,   label: 'Deadlines', desc: 'Auto finalize' },
  { icon: Binary,  label: 'Sentinel', desc: 'Dual-commit optional' },
  { icon: Sparkles,label: 'Instant Payout', desc: 'Winner gets prize' },
]

export default function IconPills() {
  return (
    <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex gap-2 md:gap-3 min-w-max py-2">
        {pills.map(({ icon: Icon, label, desc }) => (
          <li key={label} className="shrink-0">
            <div className="group inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-2 hover:bg-slate-800 transition">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/10 ring-1 ring-sky-400/30">
                <Icon className="h-4 w-4 text-sky-300" />
              </span>
              <div className="leading-tight">
                <div className="text-slate-100 text-sm">{label}</div>
                <div className="text-[11px] text-slate-400">{desc}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
