'use client'

import { randomSalt32 } from '@/lib/utils'
import Tooltip from '@/components/Tooltip'
import toast from 'react-hot-toast'

export default function SaltField({
  value,
  onChange,
}: { value: `0x${string}`; onChange: (s: `0x${string}`) => void }) {

  function copy() {
    navigator.clipboard.writeText(value).then(
      () => toast.success('Salt copied'),
      () => toast.error('Copy failed')
    )
  }

  function regen() {
    onChange(randomSalt32())
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="label mb-1 flex items-center gap-2">
          Secret salt
          <Tooltip content="We commit to the hash now; you reveal this salt later to prove fairness. Keep it safe!">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs text-slate-200">i</span>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={copy}>Copy</button>
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={regen}>Regenerate</button>
        </div>
      </div>
      <input className="input" value={value} onChange={(e)=>onChange(e.target.value as any)} />
      <div className="text-xs text-slate-400 mt-1">
        You can optionally encrypt this with a passphrase when creating the pool; we’ll also offer a local backup file.
      </div>
    </div>
  )
}
