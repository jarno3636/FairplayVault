'use client'

import { useState } from 'react'

export default function CopyCode({ code }: { code: string }) {
  const [ok, setOk] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setOk(true)
      setTimeout(() => setOk(false), 1200)
    } catch {}
  }
  return (
    <button
      onClick={copy}
      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
    >
      {ok ? 'Copied ✓' : 'Copy'}
    </button>
  )
}
