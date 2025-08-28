import CreatePoolCard from '@/components/CreatePoolCard'
import PoolList from '@/components/PoolList'

export default function Home() {
  return (
    <main className="space-y-6">
      <div className="card">
        <h1>Provably-fair Pools</h1>
        <p className="text-slate-400">Commit–reveal on Base. VRF-free fairness, dual-commit optional.</p>
      </div>
      <CreatePoolCard />
      <section className="space-y-3">
        <h2>Recent Pools</h2>
        <PoolList />
      </section>
    </main>
  )
}
