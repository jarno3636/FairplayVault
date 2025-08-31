// app/mini/page.tsx
'use client'

import Link from 'next/link'
import AppReady from '@/components/AppReady'
import { useMiniAppReady } from '@/hooks/useMiniAppReady'

export const dynamic = 'force-static' // tiny & crawler-friendly

export default function MiniLanding() {
  const { isReady, inFarcaster } = useMiniAppReady()

  return (
    <main className="min-h-[60vh] grid place-items-center p-6 text-center">
      <AppReady />
      <div>
        <h1 className="text-2xl font-semibold">FairPlay Vault Mini App</h1>
        <p className="mt-2 text-slate-400">
          {inFarcaster
            ? isReady ? 'Ready in Farcaster.' : 'Initializing…'
            : 'You’re viewing the fallback landing (open inside Farcaster to embed).'}
        </p>
        {!inFarcaster && (
          <Link href="/" className="btn mt-4">Open the full app</Link>
        )}
        <noscript><p className="mt-3 text-xs text-slate-500">Enable JavaScript to use the app.</p></noscript>
      </div>
    </main>
  )
}
