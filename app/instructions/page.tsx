// app/instructions/page.tsx
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function Instructions() {
  return (
    <div className="max-w-3xl space-y-8">
      {/* Intro */}
      <section className="card">
        <h1 className="text-2xl font-semibold">How Fairplay Pools Work</h1>
        <p className="mt-2 text-slate-300">
          FairplayVault runs <b>commit–reveal</b> USDC pools on <span className="text-cyan-300 font-semibold">Base</span>.
          Everyone pays the same entry price. The pool draws a winner after a short reveal phase using secrets
          (salts) committed ahead of time—so the outcome is <i>provably fair without VRF</i>.
        </p>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          <li className="rounded-xl border border-white/10 p-3 bg-slate-900/40">
            <div className="text-slate-200 font-medium">No VRF dependency</div>
            <div className="text-slate-400 text-sm">Fairness comes from the creator’s pre-committed salt (and an optional sentinel).</div>
          </li>
          <li className="rounded-xl border border-white/10 p-3 bg-slate-900/40">
            <div className="text-slate-200 font-medium">Instant, on-chain payout</div>
            <div className="text-slate-400 text-sm">Winner is paid directly from the pool when finalized.</div>
          </li>
        </ul>

        <div className="mt-4 text-xs text-slate-500">
          Tip: If you’re a developer, you can integrate with the SDK and customize fees on your own deployment.
        </div>
      </section>

      {/* Quick start for creators */}
      <section className="card">
        <Header title="Create a Pool — Quick Start" subtitle="~2 minutes" />
        <ol className="list-decimal pl-6 space-y-3 text-slate-300">
          <li>
            <b>Choose basics:</b> entry price, optional entry caps, and timing (entry window &amp; reveal window).
          </li>
          <li>
            <b>Salt is auto-generated:</b> keep it safe. You’ll reveal it later. You can optionally encrypt and download a local backup.
          </li>
          <li>
            <b>(Optional) Add a sentinel:</b> a second, independent salt/commit that reveals after you for extra “you didn’t bias it”
            assurances. You can paste a commit or fetch from your sentinel service.
          </li>
          <li>
            <b>Approve &amp; Create:</b> approve the bond(s), then submit. The pool opens until the entry deadline.
          </li>
          <li>
            <b>Reveal on time:</b> after entries close, reveal your salt (and the sentinel reveals theirs if configured), then finalize.
          </li>
        </ol>

        <Callout kind="info" className="mt-4">
          <b>Fees:</b> On this hosted app, fees are fixed for simplicity. If you need custom fees, use the SDK on your own deployment.
        </Callout>

        <div className="mt-4 flex gap-3">
          <Link href="/" className="btn">Create a Pool</Link>
          <Link href="/about" className="btn-secondary">Learn more</Link>
        </div>
      </section>

      {/* Joining a pool */}
      <section className="card">
        <Header title="Join a Pool" subtitle="For participants" />
        <ol className="list-decimal pl-6 space-y-3 text-slate-300">
          <li>
            <b>Pick a pool</b> from the list and review the entry price, close time, and any min/max entry limits.
          </li>
          <li>
            <b>Approve USDC</b> (one-time per token/contract), then choose a quantity and click <b>Enter</b>.
          </li>
          <li>
            <b>Wait for reveal/finalize:</b> once the reveal phase is complete, the contract draws a winner and pays out instantly.
          </li>
        </ol>

        <Callout kind="tip" className="mt-4">
          You can track pool status on the <Link href="/" className="link">home page</Link> or via the block explorer.
        </Callout>
      </section>

      {/* Timeline */}
      <section className="card">
        <Header title="Timeline at a Glance" />
        <div className="grid gap-4 sm:grid-cols-3">
          <TimelineItem title="1) Entry Window" desc="Users join by paying the entry price." />
          <TimelineItem title="2) Reveal Window" desc="Creator reveals their salt; sentinel reveals if configured." />
          <TimelineItem title="3) Finalize" desc="Contract computes the winner & pays out. Missed reveals may slash bonds." />
        </div>
      </section>

      {/* Salts & fairness */}
      <section className="card">
        <Header title="Salts, Commits & Fairness" />
        <p className="text-slate-300">
          When a pool is created, the creator’s salt is <b>committed (hashed) on-chain</b>. Later, during the reveal window, the creator
          reveals the raw salt. The contract checks it matches the prior commit, then uses it—plus other pool state—to derive the random
          outcome. If a sentinel is used, their commit & reveal happens too, making it even harder to bias.
        </p>
        <ul className="mt-3 list-disc pl-6 text-slate-300">
          <li><b>Keep your salt safe.</b> Losing it means you can’t reveal (and you may lose your bond).</li>
          <li><b>Don’t share the raw salt early.</b> Only reveal during the reveal phase.</li>
          <li><b>Sentinel is optional.</b> It’s an extra proof against creator bias for higher-stakes pools.</li>
        </ul>
      </section>

      {/* Fees & bonds */}
      <section className="card">
        <Header title="Fees & Bonds" />
        <ul className="space-y-3 text-slate-300">
          <li>
            <b>Entry price:</b> what each participant pays to enter. Total prize is entries minus fees.
          </li>
          <li>
            <b>Protocol / Builder fees:</b> set by this app and/or contract configuration. On this hosted app, they’re fixed for consistency.
          </li>
          <li>
            <b>Bonds:</b> refundable deposits from creator (and sentinel if used). Missing reveals or certain failure conditions can slash bonds.
          </li>
        </ul>
        <div className="mt-3 text-xs text-slate-500">
          Want different fee behavior? See <Link href="/about" className="link">About</Link> for the SDK & deployment options.
        </div>
      </section>

      {/* Best practices */}
      <section className="card">
        <Header title="Best Practices" />
        <ul className="space-y-2 text-slate-300 list-disc pl-6">
          <li><b>Back up your salt</b> (the app offers a local JSON backup). Consider encrypting it with a passphrase.</li>
          <li><b>Pick sensible windows:</b> short enough to keep momentum, long enough that you can reveal on time.</li>
          <li><b>Use a sentinel</b> for larger pools to strengthen fairness guarantees.</li>
          <li><b>Communicate clearly</b> to participants: entry close time, reveal time, and when to expect finalization.</li>
        </ul>
      </section>

      {/* FAQ */}
      <section className="card">
        <Header title="FAQ" />
        <div className="space-y-2">
          <Faq q="What happens if the creator forgets to reveal?"
               a="Their bond may be slashed. If a sentinel is configured and reveals correctly, finalization can still proceed according to contract rules." />
          <Faq q="Do I need a sentinel?"
               a="No. Sentinel is optional. It adds an extra, independent commit to further reduce the chance of creator bias." />
          <Faq q="How is the winner chosen?"
               a="The contract derives randomness from committed salts and pool state. Since salts are committed ahead of time, the outcome is verifiable." />
          <Faq q="Can I change fees?"
               a="On this hosted app, fees are fixed. You can deploy your own UI/SDK integration to set your own fee policy." />
          <Faq q="Which network does this run on?"
               a="Base mainnet. Ensure your wallet is connected to Base before interacting." />
        </div>
      </section>

      {/* Need help */}
      <section className="card">
        <Header title="Need Help?" />
        <p className="text-slate-300">
          Check the <Link href="/about" className="link">About</Link> page for technical notes and SDK pointers,
          or reach out via the footer links. You can also inspect transactions on the configured explorer for your network.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/" className="btn">Create a Pool</Link>
          <Link href="/#recent" className="btn-secondary">Browse Pools</Link>
        </div>
      </section>
    </div>
  )
}

/* ---------- tiny presentational helpers (no deps) ---------- */

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      {subtitle && <p className="text-slate-400 text-sm">{subtitle}</p>}
    </div>
  )
}

function Callout({
  kind = 'info',
  children,
  className = '',
}: {
  kind?: 'info' | 'tip' | 'warn'
  children: React.ReactNode
  className?: string
}) {
  const styles =
    kind === 'warn'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
      : kind === 'tip'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
      : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100'
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles} ${className}`}>
      {children}
    </div>
  )
}

function TimelineItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-4 bg-slate-900/40">
      <div className="font-medium text-slate-200">{title}</div>
      <div className="text-slate-400 text-sm">{desc}</div>
    </div>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-lg border border-white/10 bg-slate-900/40 p-3">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-200">{q}</span>
          <span className="ml-3 text-slate-400 transition group-open:rotate-180">▾</span>
        </div>
      </summary>
      <div className="mt-2 text-slate-300">{a}</div>
    </details>
  )
}
