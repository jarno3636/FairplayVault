'use client'

import { useState } from 'react'
import clsx from 'clsx'

const PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h',  minutes: 60 },
  { label: '2h',  minutes: 120 },
  { label: '24h', minutes: 1440 },
]

type Props = {
  label: string
  valueMinutes: number
  onChange: (minutes: number) => void
  minMinutes?: number
}

export default function DurationPicker({ label, valueMinutes, onChange, minMinutes = 1 }: Props) {
  const [mode, setMode] = useState<'preset' | 'custom'>(isPreset(valueMinutes) ? 'preset' : 'custom')
  const [customH, setCustomH] = useState(Math.floor(valueMinutes / 60))
  const [customM, setCustomM] = useState(valueMinutes % 60)

  function isPreset(v: number) {
    return PRESETS.some(p => p.minutes === v)
  }

  function applyPreset(m: number) {
    setMode('preset')
    onChange(Math.max(minMinutes, m))
  }

  function applyCustom(h: number, m: number) {
    const total = Math.max(minMinutes, (h * 60) + m)
    setMode('custom')
    setCustomH(h)
    setCustomM(m)
    onChange(total)
  }

  return (
    <div>
      <div className="label mb-2">{label}</div>
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.minutes)}
            className={clsx(
              'rounded-full px-3 py-1.5 text-sm ring-1 transition',
              valueMinutes === p.minutes
                ? 'bg-cyan-500 text-white ring-cyan-400/40'
                : 'text-slate-200 ring-white/10 hover:bg-white/5'
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMode('custom')}
          className={clsx(
            'rounded-full px-3 py-1.5 text-sm ring-1 transition',
            mode === 'custom' ? 'bg-cyan-500 text-white ring-cyan-400/40' : 'text-slate-200 ring-white/10 hover:bg-white/5'
          )}
        >
          Custom
        </button>
        <span className="ml-2 text-sm text-slate-400">
          Selected: <b>{fmtMinutes(valueMinutes)}</b>
        </span>
      </div>

      {mode === 'custom' && (
        <div className="mt-2 flex items-center gap-2">
          <NumberBox label="h" value={customH} onChange={(h) => applyCustom(Math.max(0, h), customM)} />
          <NumberBox label="m" value={customM} onChange={(m) => applyCustom(customH, clamp(m, 0, 59))} />
        </div>
      )}
    </div>
  )
}

function NumberBox({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <input
        type="number"
        className="input w-24"
        value={value}
        onChange={(e)=>onChange(Number(e.target.value || 0))}
      />
    </label>
  )
}
function clamp(n:number, lo:number, hi:number){ return Math.max(lo, Math.min(hi, n)) }
function fmtMinutes(min:number){
  if (min < 60) return `${min}m`
  const h = Math.floor(min/60), m = min%60
  return m ? `${h}h ${m}m` : `${h}h`
}
