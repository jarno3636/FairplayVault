// app/products/page.tsx
import SdkFeaturedDemo from '@/components/products/SdkFeaturedDemo'
import CountdownBadgeDemo from '@/components/products/CountdownBadgeDemo'
import PoolProgressDemo from '@/components/products/PoolProgressDemo'
import StatusBadgeDemo from '@/components/products/StatusBadgeDemo'
import TimerStripDemo from '@/components/products/TimerStripDemo'
import PrizeTickerDemo from '@/components/products/PrizeTickerDemo'

export const dynamic = 'force-dynamic'

export default function ProductsPage() {
  return (
    <main className="space-y-8">
      <section className="card text-center">
        <h1 className="text-2xl font-semibold">Free UI Bits & SDK</h1>
        <p className="mt-2 text-slate-300">
          Drop-in components and a typed SDK to build provably-fair pools on Base.
        </p>
      </section>

      {/* Featured */}
      <SdkFeaturedDemo />

      {/* Freebies grid */}
      <div className="grid-cards">
        <CountdownBadgeDemo />
        <PoolProgressDemo />
        <StatusBadgeDemo />
        <TimerStripDemo />
        <PrizeTickerDemo />
      </div>
    </main>
  )
}
