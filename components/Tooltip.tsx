'use client'

import { PropsWithChildren, useState } from 'react'

export default function Tooltip({
  content,
  side = 'top',
  children,
  className = '',
}: PropsWithChildren<{ content: string; side?: 'top'|'bottom'|'left'|'right'; className?: string }>) {
  const [open, setOpen] = useState(false)

  const pos = {
    top: 'bottom-full left-1/2 -translate-x-1/2 -translate-y-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 translate-y-2',
    left: 'right-full top-1/2 -translate-y-1/2 -translate-x-2',
    right: 'left-full top-1/2 -translate-y-1/2 translate-x-2',
  }[side]

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute ${pos} z-50 max-w-xs rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-xl ring-1 ring-white/10`}
        >
          {content}
        </span>
      )}
    </span>
  )
}
