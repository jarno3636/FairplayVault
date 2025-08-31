// components/AppReady.tsx
'use client'

import { useEffect } from 'react'

export default function AppReady() {
  useEffect(() => {
    (async () => {
      try {
        // Try frame SDK; fall back to miniapp SDK
        const mod =
          (await import('@farcaster/frame-sdk').catch(() => null)) ||
          (await import('@farcaster/miniapp-sdk').catch(() => null))

        const sdk: any =
          (mod as any)?.frame ||
          (mod as any)?.sdk ||
          (mod as any)?.default ||
          mod

        const readyFn =
          sdk?.actions?.ready ??
          sdk?.ready ??
          sdk?.sdk?.actions?.ready ??
          sdk?.sdk?.ready

        if (typeof readyFn === 'function') {
          await readyFn()
        }
      } catch {
        // Not in Farcaster or SDK unavailable — safe to ignore.
      }
    })()
  }, [])
  return null
}
