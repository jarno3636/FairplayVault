'use client'

import { useEffect, useState } from 'react'

/**
 * Optional Farcaster Mini App bootstrap.
 * - Dynamically loads @farcaster/frame-sdk (no hard dependency).
 * - Detects Mini App/Frame environment.
 * - Calls actions.ready() if available.
 * - Reads context (safe-area insets) and exposes CSS vars.
 */
export default function MiniAppBoot() {
  const [isMiniApp, setIsMiniApp] = useState(false)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (typeof window === 'undefined') return

      // Try to import the Farcaster SDK if present.
      let frame: any | null = null
      try {
        const mod: any = await import('@farcaster/frame-sdk')
        // Handle various export shapes gracefully
        frame = mod?.frame || mod?.default || mod
      } catch {
        // SDK not installed — this component is strictly optional.
        return
      }
      if (!frame) return

      try {
        // Environment detection (support older/newer SDK shapes)
        const inMini =
          (typeof frame.isMiniApp === 'function' && (await frame.isMiniApp())) ||
          (typeof frame.isFrame === 'function' && (await frame.isFrame())) ||
          (typeof frame?.sdk?.isMiniApp === 'function' && (await frame.sdk.isMiniApp())) ||
          false

        if (cancelled) return
        if (!inMini) return

        setIsMiniApp(true)

        // Signal readiness to the host, if supported
        const readyFn =
          frame?.sdk?.actions?.ready ||
          frame?.actions?.ready ||
          frame?.ready
        if (typeof readyFn === 'function') {
          await readyFn()
        }

        // Read context for safe-area insets (if provided)
        const ctx =
          frame?.context ||
          frame?.sdk?.context ||
          null

        const insets = ctx?.client?.safeAreaInsets
        if (insets && typeof document !== 'undefined') {
          const { top = 0, right = 0, bottom = 0, left = 0 } = insets
          const root = document.documentElement
          root.style.setProperty('--safe-top', `${top}px`)
          root.style.setProperty('--safe-right', `${right}px`)
          root.style.setProperty('--safe-bottom', `${bottom}px`)
          root.style.setProperty('--safe-left', `${left}px`)
        }

        // Optional: expose for quick debugging
        ;(window as any).__miniapp = { context: ctx }
      } catch {
        // Ignore — mini app features are optional
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // No UI needed; tweak if you want a banner in-frame.
  return isMiniApp ? null : null
}
