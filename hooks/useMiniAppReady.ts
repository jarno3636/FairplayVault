// hooks/useMiniAppReady.ts
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

function detectFarcaster() {
  if (typeof window === 'undefined') return false
  try {
    const ua = navigator?.userAgent ?? ''
    const inWarpcastUA = /Warpcast/i.test(ua)
    const inIframe = window.self !== window.top
    const pathHint = window.location?.pathname?.startsWith?.('/mini')
    return Boolean(inWarpcastUA || inIframe || pathHint)
  } catch {
    return false
  }
}

export function useMiniAppReady() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const inFC = useMemo(detectFarcaster, [])

  useEffect(() => {
    let timeoutId: number | undefined

    ;(async () => {
      try {
        if (inFC && typeof window !== 'undefined') {
          const mod =
            (await import('@farcaster/frame-sdk').catch(() => null)) ||
            (await import('@farcaster/miniapp-sdk').catch(() => null))

          let sdk: any =
            (mod as any)?.frame ||
            (mod as any)?.sdk ||
            (mod as any)?.default ||
            mod

          const readyFn =
            sdk?.actions?.ready ??
            sdk?.ready ??
            sdk?.sdk?.actions?.ready ??
            sdk?.sdk?.ready

          const readyPromise =
            typeof readyFn === 'function' ? readyFn() : Promise.resolve()

          // 1200ms timeout so we don’t hang the UI
          const timeout = new Promise((resolve) => {
            timeoutId = window.setTimeout(resolve, 1200)
          })

          await Promise.race([readyPromise, timeout])
        }
        if (mountedRef.current) setIsReady(true)
      } catch (e) {
        console.error('MiniApp ready failed:', e)
        if (mountedRef.current) {
          setError(e)
          setIsReady(true)
        }
      } finally {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      }
    })()
  }, [inFC])

  return { isReady, error, inFarcaster: inFC }
}
