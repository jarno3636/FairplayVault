import CreatePoolCard from '@/components/CreatePoolCard'
import PoolList from '@/components/PoolList'
// (Optional) If you already have an IconPills component, import and use it below.

export default function Home() {
  return (
    <main className="space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950 p-10 text-center shadow-xl">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Provably-Fair USDC Pools
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-lg text-slate-300">
          Commit–reveal on <span className="font-semibold text-cyan-400">Base</span>. Flat entry price. No VRF. Optional dual-commit.
        </p>

        <div className="mt-6 flex justify-center gap-4">
          <a href="#create" className="rounded-full bg-cyan-500 px-5 py-2.5 font-medium text-white shadow hover:bg-cyan-400 transition">
            Create a Pool
          </a>
          <a href="#recent" className="rounded-full border border-slate-600 px-5 py-2.5 font-medium text-slate-200 hover:bg-slate-800 transition">
            View Pools
          </a>
        </div>

        {/* Optional: small scrolling pill row of features */}
        {/* <div className="mt-8 opacity-90">
          <IconPills />
        </div> */}
      </section>

      {/* CREATE */}
      <section id="create" className="card">
        <h2 className="text-xl font-semibold mb-2">Create a Pool</h2>
        <CreatePoolCard />
      </section>

      {/* RECENT */}
      <section id="recent" className="space-y-3">
        <h2 className="text-xl font-semibold">Recent Pools</h2>
        <PoolList />
      </section>
    </main>
  )
}
