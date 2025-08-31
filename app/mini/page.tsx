// app/mini/page.tsx
import Link from 'next/link'

export const dynamic = 'force-static' // keep it lightweight & crawler-friendly
export const revalidate = 60 // ok to cache for a bit; not critical

export default function MiniLanding() {
  return (
    <main className="min-h-[70vh] grid place-items-center px-6 py-10">
      <div className="max-w-xl text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
          FairPlay Vault — Mini App
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold">
          Provably-fair USDC pools on Base
        </h1>

        <p className="text-slate-300">
          This is the lightweight landing experience used by Farcaster Mini Apps.
          If you’re viewing this in a regular browser, hit the button below to open the full app.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/" className="btn">
            Open Full App
          </Link>

          {/* Handy deep-link for Coinbase Wallet users */}
          <a
            className="btn-secondary"
            href={`cbwallet://dapp?url=${encodeURIComponent('https://fairplay-vault.vercel.app')}`}
          >
            Open in Coinbase Wallet
          </a>
        </div>

        <div className="text-xs text-slate-500 pt-2">
          Tip: In Warpcast, tap the Play button on the card to open this mini view in-app.
        </div>

        <noscript>
          <p className="mt-4 text-xs text-slate-400">
            JavaScript is required for the full experience.
          </p>
        </noscript>
      </div>
    </main>
  )
}
