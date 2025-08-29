'use client'

import Tooltip from '@/components/Tooltip'

type Props = {
  entryPrice: bigint        // raw token units (e.g. 6 decimals for USDC)
  builderFeeBps: number
  protocolFeeBps: number
  expectedEntries: number
  format: (v: bigint) => string
  symbol: string
  onChangeExpected?: (n: number) => void
}

const MAX_BPS = 10_000n

export default function FeesExplainer({
  entryPrice,
  builderFeeBps,
  protocolFeeBps,
  expectedEntries,
  format,
  symbol,
  onChangeExpected
}: Props) {
  const entries = Math.max(0, Math.floor(expectedEntries || 0))
  const gross = (entryPrice * BigInt(entries))
  const builderCut = (gross * BigInt(builderFeeBps)) / MAX_BPS
  const protocolCut = (gross * BigInt(protocolFeeBps)) / MAX_BPS
  const prize = gross - builderCut - protocolCut

  return (
    <div className="rounded-xl border border-white/10 p-4 bg-slate-900/50 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Prize & Fees Preview</div>
        <Tooltip content="This is an off-chain estimate based on your inputs. Actual amounts depend on final entries.">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs text-slate-200">i</span>
        </Tooltip>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField
          label="Expected entries"
          value={entries}
          onChange={(n)=>onChangeExpected?.(n)}
          min={0}
        />
        <ReadRow label="Gross collected" value={`${format(gross)} ${symbol}`} />
        <ReadRow label="Estimated prize (net)" value={
          <span className="text-emerald-300 font-medium">{`${format(prize)} ${symbol}`}</span>
        } />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ReadRow label={`Builder fee (${builderFeeBps} bps)`} value={`${format(builderCut)} ${symbol}`} />
        <ReadRow label={`Protocol fee (${protocolFeeBps} bps)`} value={`${format(protocolCut)} ${symbol}`} />
      </div>
    </div>
  )
}

function ReadRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  )
}

function NumberField({
  label, value, onChange, min = 0, max
}: { label: string; value: number; onChange?: (n:number)=>void; min?: number; max?: number }) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <input
        className="input"
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e)=>onChange?.(Number(e.target.value || 0))}
      />
    </div>
  )
}
