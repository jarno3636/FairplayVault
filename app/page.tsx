// app/page.tsx
import Link from 'next/link'
import { CheckCircle2, Shield, Timer, Ticket, TrendingUp, Layers } from 'lucide-react'
import CreatePoolCard from '@/components/CreatePoolCard'
import PoolList from '@/components/PoolList'

export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <main className="space-y-12">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/15 via-slate-900 to-slate-950 p-10 shadow-xl">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
            <Shield className="h-3.5 w-3.5" /> Commit–reveal on Base — no VRF required
          </div>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Run <span className="text-cyan-400">provably-fair</span> USDC pools on Base
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            Create time-boxed pools with flat entry pricing, optional dual-commit sentinel, and instant payouts.
            Simple for creators, transparent for players.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="#create" className="btn">Create a Pool</Link>
            <Link href="#recent" className="btn-secondary">Browse Pools</Link>
            <Link href="/products" className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5">
              Explore Products & SDK
            </Link>
          </div>

          {/* quick stats / trust row */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 text-left">
            <Stat label="Network" value="Base Mainnet" />
            <Stat label="Currency" value="USDC (6 decimals)" />
            <Stat label="Fairness" value="Commit–Reveal (+ optional sentinel)" />
          </div>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="grid gap-4 md:grid-cols-3">
        <Feature
          icon={<Ticket className="h-5 w-5" />}
          title="Flat entry, instant payout"
          desc="Everyone pays the same price per entry; winner is drawn and paid automatically after reveal."
        />
        <Feature
          icon={<Shield className="h-5 w-5" />}
          title="No external VRF"
          desc="Randomness comes from salts + blockhash. Add a sentinel for greater neutrality."
        />
        <Feature
          icon={<Timer className="h-5 w-5" />}
          title="Clear timing"
          desc="Entry and reveal windows enforce simple, predictable phases for all participants."
        />
      </section>

      {/* HOW IT WORKS */}
      <section className="card">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-xl font-semibold">How it works</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Step
              n={1}
              title="Create"
              points={[
                'Set entry price, windows & fees',
                'Commit to a secret salt',
                'Optionally add a sentinel',
              ]}
            />
            <Step
              n={2}
              title="Enter"
              points={[
                'Players approve USDC once',
                'Buy entries at a flat price',
                'Wait for the deadline',
              ]}
            />
            <Step
              n={3}
              title="Reveal & Draw"
              points={[
                'Creator (and sentinel) reveal salts',
                'Contract draws a winner on-chain',
                'Prize paid instantly',
              ]}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/instructions" className="btn-secondary">See full instructions</Link>
            <Link href="/about" className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5">
              Learn more about Fairplay
            </Link>
          </div>
        </div>
      </section>

      {/* CREATE POOL */}
      <section id="create" className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create a Pool</h2>
          <div className="inline-flex items-center gap-2 text-xs text-slate-400">
            <Layers className="h-4 w-4" />
            Works with your wallet on Base
          </div>
        </div>
        <CreatePoolCard />
        <div className="text-xs text-slate-400">
          Tip: You can encrypt your creator salt on creation; we also offer a local backup file for safekeeping.
        </div>
      </section>

      {/* RECENT POOLS */}
      <section id="recent" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Pools</h2>
          <Link href="/products" className="text-sm text-cyan-300 hover:text-cyan-200 underline decoration-cyan-300/40">
            Want badges, timers, or embeds? Check Products →
          </Link>
        </div>
        <PoolList />
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-8 text-center">
        <div className="mx-auto max-w-3xl">
          <h3 className="text-2xl font-semibold">Building on Fairplay?</h3>
          <p className="mt-2 text-slate-300">
            Ship faster with our SDK, ready-made UI widgets, and sentinel APIs. Monetize via builder fees you control.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/products" className="btn">Explore Products & SDK</Link>
            <Link href="/fees" className="btn-secondary">Fee Management</Link>
          </div>
          <p className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-400">
            <CheckCircle2 className="h-4 w-4" /> Fully compatible with RainbowKit, wagmi, and viem
          </p>
        </div>
      </section>
    </main>
  )
}

/* ---------- tiny presentational helpers (inline to avoid new files) ---------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-white/10 p-2 text-cyan-300">{icon}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-slate-300">{desc}</p>
    </div>
  )
}

function Step({ n, title, points }: { n: number; title: string; points: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/30">{n}</div>
        <div className="font-medium">{title}</div>
      </div>
      <ul className="mt-2 list-disc pl-6 text-sm text-slate-300">
        {points.map((p) => <li key={p}>{p}</li>)}
      </ul>
    </div>
  )
}
