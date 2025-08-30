'use client'

import { useEffect, useState } from 'react'

/**
 * Optional Farcaster Mini Apps bootstrap.
 * - Loads @farcaster/miniapp-sdk at runtime (no hard dependency).
 * - Detects Mini App environment.
 * - Calls actions.ready()
 * - Exposes context + CSS safe-area vars.
 */
export default function MiniAppBoot() {
  const [isMiniApp, setIsMiniApp] = useState(false)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      // Only in browser
      if (typeof window === 'undefined') return

      // Try to import the SDK if available (won’t crash if not installed)
      let sdk: any
      try {
        const mod = await import(/* webpackIgnore: true */ '@farcaster/miniapp-sdk')
        sdk = mod.sdk || mod.default?.sdk || mod
      } catch {
        // SDK not present — just bail silently
        return
      }

      try {
        // Detect whether we’re actually inside a Mini App
        const inMini = await sdk.isInMiniApp?.()
        if (cancelled) return
        if (!inMini) return

        setIsMiniApp(true)

        // Let the host know we’re ready
        if (sdk.actions?.ready) await sdk.actions.ready()

        // Read context for safe area insets, etc.
        const ctx = sdk.context
        if (ctx?.client?.safeAreaInsets) {
          const { top, right, bottom, left } = ctx.client.safeAreaInsets
          const root = document.documentElement
          root.style.setProperty('--safe-top', `${top}px`)
          root.style.setProperty('--safe-right', `${right}px`)
          root.style.setProperty('--safe-bottom', `${bottom}px`)
          root.style.setProperty('--safe-left', `${left}px`)
        }

        // (Optional) expose on window for quick debugging
        ;(window as any).__miniapp = { context: ctx }
      } catch {
        // Ignore — mini app features are strictly optional
      }
    })()

    return () => { cancelled = true }
  }, [])

  // You could render nothing, or a tiny banner in mini-apps if you want:
  return isMiniApp ? null : null
}
