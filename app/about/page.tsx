// app/about/page.tsx
import Link from 'next/link'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default function About() {
  const vault = env.vault || process.env.NEXT_PUBLIC_VAULT_ADDRESS || ''
  const explorer = env.explorer || process.env.NEXT_PUBLIC_EXPLORER || 'https://basescan.org'
  const chainName = 'Base (Mainnet)'

  return (
    <main className="space-y-8">
      {/* Hero / Intro */}
      <section className="card">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight">About Fairplay</h1>
          <p className="mt-3 text-slate-300">
            Fairplay is a <span className="font-semibold text-cyan-300">commit–reveal</span> pool engine for USDC on
            Base. Creators configure a pool, participants enter at a fixed price, and a winner is drawn using revealed
            salts plus a block hash. No external VRF required, with an optional sentinel for extra neutrality.
          </p>

          {/* Quick facts */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Fact label="Network" value={chainName} />
            <Fact label="Currency" value="USDC (6 decimals)" />
            <Fact label="Fairness" value="Commit–reveal (+ optional sentinel)" />
          </div>

          {/* Contract */}
          {vault && (
            <div className="mt-4 text-sm text-slate-400">
              Contract:{' '}
              <a
                className="link"
                href={`${explorer}/address/${vault}`}
                target="_blank"
                rel="noreferrer"
              >
                {vault}
              </a>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="card">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-xl font-semibold">How it works</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-6 text-slate-300">
            <li>
              <b>Create:</b> The creator commits to a secret salt (its hash is stored on-chain), sets entry price,
              timing windows, and fees. (Optional) A sentinel also commits.
            </li>
            <li>
              <b>Enter:</b> Participants approve USDC and buy entries at a flat price during the entry window.
            </li>
            <li>
              <b>Reveal:</b> After entries close, the creator (and optional sentinel) reveal their salts before the
              reveal deadline(s).
            </li>
            <li>
              <b>Draw:</b> The contract derives a random word from the revealed salts + block hash and pays the winner
              instantly. Unpaid fees accrue to designated recipients.
            </li>
          </ol>
        </div>
      </section>

      {/* Fairness model */}
      <section className="card">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-xl font-semibold">Fairness & security model</h2>
          <div className="mt-3 space-y-3 text-slate-300">
            <p>
              Commit–reveal ensures the randomness seed is fixed before anyone knows the reveal time block hash. Using a
              <b> sentinel</b> (a second independent commit) makes the combined seed harder to bias.
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <b>Bonds:</b> Creator and (optionally) sentinel post refundable bonds. Missed or late reveals can be
                slashed to discourage griefing.
              </li>
              <li>
                <b>No VRF dependency:</b> Randomness is derived from on-chain data (salts + block hash); fewer moving
                parts, lower cost.
              </li>
              <li>
                <b>Deadlines:</b> Entry and reveal windows are strict to remove ambiguity and race conditions.
              </li>
            </ul>
            <Note>
              Always verify contract addresses, keep prize sizes reasonable while you iterate, and understand the timing
              model before running large pools.
            </Note>
          </div>
        </div>
      </section>

      {/* Roles & responsibilities */}
      <section className="card">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-xl font-semibold">Roles</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Role
              title="Creator"
              points={[
                'Commits to a secret salt and sets pool parameters.',
                'Posts a bond and must reveal on time.',
                'Receives the builder fee (if configured).',
              ]}
            />
            <Role
              title="Sentinel (optional)"
              points={[
                'Provides a second, independent commit.',
                'Posts a bond; must reveal on time.',
                'Improves neutrality of the seed.',
              ]}
            />
            <Role
              title="Participant"
              points={[
                'Approves USDC and enters at a fixed price.',
                'Awaits draw after reveals.',
                'Receives prize instantly if selected.',
              ]}
            />
          </div>
        </div>
      </section>

      {/* Fees */}
      <section className="card">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-xl font-semibold">Fees</h2>
          <p className="mt-3 text-slate-300">
            Fees are set in basis points (bps) at pool creation. For example, <b>200 bps = 2%</b>. Fees are split
            between the builder and protocol recipients configured in the contract. If you build on top of Fairplay via
            our SDK, you can designate your own builder recipient.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Tag label="Builder fee" value="e.g. 2% (200 bps)" />
            <Tag label="Protocol fee" value="e.g. 1% (100 bps)" />
            <Tag label="Slashing" value="Missed reveal bonds" />
          </div>
        </div>
      </section>

      {/* Accessibility & UX notes */}
      <section className="card">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-xl font-semibold">Accessibility & UX</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
            <li>Clear language and tooltips explain pool parameters.</li>
            <li>High-contrast palette and large touch targets on mobile.</li>
            <li>Keyboard accessible navigation and focus states.</li>
          </ul>
          <div className="mt-4 text-sm text-slate-400">
            If you encounter any accessibility issues, please contact us so we can improve the experience.
          </div>
        </div>
      </section>

      {/* Roadmap & links */}
      <section className="card">
        <div className="mx-auto max-w-3xl space-y-4">
          <h2 className="text-xl font-semibold">Roadmap</h2>
          <ul className="list-disc space-y-2 pl-6 text-slate-300">
            <li>Curated templates and presets for popular pool types.</li>
            <li>Hosted sentinel service with APIs.</li>
            <li>Expanded analytics and public leaderboards.</li>
            <li>SDK examples (Next.js, pure viem, server actions).</li>
          </ul>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/products" className="btn">Explore Products & SDK</Link>
            <a className="btn-secondary" href="https://github.com/" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5" href={explorer} target="_blank" rel="noreferrer">
              Block Explorer
            </a>
          </div>
        </div>
      </section>

      {/* Legal / disclaimer */}
      <section className="card">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-xl font-semibold">Disclaimer</h2>
          <p className="mt-3 text-slate-300">
            Fairplay is experimental software. Use at your own risk. Nothing here is financial advice. Check local laws
            and regulations before operating prize pools or games of chance in your jurisdiction.
          </p>
        </div>
      </section>
    </main>
  )
}

/* ----------------- tiny presentational helpers ----------------- */

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-medium text-slate-100">{value}</div>
    </div>
  )
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}

function Role({ title, points }: { title: string; points: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="font-medium">{title}</div>
      <ul className="mt-2 list-disc pl-5 text-sm text-slate-300">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
      {children}
    </div>
  )
}
