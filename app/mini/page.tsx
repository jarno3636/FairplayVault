// app/mini/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Layers, Send, Ticket } from 'lucide-react'
import CreatePoolCard from '@/components/CreatePoolCard'
import PoolList from '@/components/PoolList'
import { useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fairplay-vault.vercel.app').replace(/\/$/, '')

function detectFarcaster() {
  if (typeof window === 'undefined') return false
  try {
    const ua = navigator.userAgent || ''
    const inWarpcastUA = /Warpcast/i.test(ua)
    const inIframe = window.self !== window.top
    return Boolean(inWarpcastUA || inIframe)
  } catch {
    return false
  }
}

export default function MiniEntry() {
  const search = useSearchParams()
  // ✅ TS-safe: handle potential null during type narrowing
  const screenParam = search?.get('screen') ?? 'home'
  const screen = screenParam.toLowerCase()

  const [isReady, setIsReady] = useState(false)
  const [sdkOk, setSdkOk] = useState(false)
  const isInFarcaster = useMemo(detectFarcaster, [])
  const scrolledRef = useRef(false)

  // Farcaster Mini App SDK init (safe, with timeout)
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    ;(async () => {
      try {
        if (!isInFarcaster) {
          setIsReady(true)
          return
        }
        const mod = await import('@farcaster/miniapp-sdk').catch(() => null)
        // Support both common shapes
        let sdk: any = (mod as any)?.sdk
        if (!sdk) {
          const Ctor = (mod as any)?.default || (mod as any)?.MiniAppSDK
          if (typeof Ctor === 'function') {
            try { sdk = new Ctor() } catch {}
          }
        }

        const readyPromise =
          typeof sdk?.ready === 'function'
            ? sdk.ready()
            : typeof sdk?.actions?.ready === 'function'
              ? sdk.actions.ready()
              : Promise.resolve()

        const timeout = new Promise<void>((resolve) => {
          timer = setTimeout(() => resolve(), 1200)
        })

        await Promise.race([readyPromise, timeout])
        if (!cancelled) {
          setSdkOk(Boolean(sdk))
          setIsReady(true)
        }
      } catch {
        if (!cancelled) {
          setSdkOk(false)
          setIsReady(true)
        }
      } finally {
        if (timer) clearTimeout(timer)
      }
    })()

    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [isInFarcaster])

  // Scroll to target section once (when ready)
  useEffect(() => {
    if (!isReady || scrolledRef.current) return
    scrolledRef.current = true
    const id =
      screen === 'create' ? 'mini-create' :
      screen === 'pools'  ? 'mini-pools'  :
      'mini-home'
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [isReady, screen])

  return (
    <main className="space-y-5 px-4 py-5">
      {/* Mini header */}
      <section
        id="mini-home"
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/15 via-slate-900 to-slate-950 p-5 text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] text-cyan-200">
          on @base
        </div>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
          FairPlay&nbsp;Vault
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Provably-fair USDC pools (commit–reveal). No VRF required.
        </p>

        {!isInFarcaster && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <a
              href={SITE}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Open full site
            </a>
          </div>
        )}

        {isInFarcaster && (
          <div className="mt-3 text-[11px] text-slate-400">
            {sdkOk ? 'Mini App ready in Warpcast' : 'Running in mini preview'}
          </div>
        )}
      </section>

      {/* Create */}
      <section id="mini-create" className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create a Pool</h2>
          <div className="inline-flex items-center gap-2 text-xs text-slate-400">
            <Layers className="h-4 w-4" aria-hidden="true" />
            Works with your wallet on Base
          </div>
        </div>
        <CreatePoolCard />
        <p className="text-xs text-slate-400">
          Tip: encrypt your creator salt on creation; download the local backup for safekeeping.
        </p>
      </section>

      {/* Recent Pools */}
      <section id="mini-pools" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Pools</h2>
          <Link
            href="/products"
            className="text-sm text-cyan-300 underline decoration-cyan-300/40 hover:text-cyan-200"
          >
            Widgets &amp; SDK →
          </Link>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 inline-flex items-center gap-2 text-sm text-slate-200">
            <Ticket className="h-4 w-4" aria-hidden="true" />
            Live now
          </div>
          <PoolList />
        </div>
      </section>

      {/* Mini footer nav */}
      <nav className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <a href={`${SITE}/`} className="underline decoration-dotted hover:text-slate-200">Home</a>
        <span aria-hidden="true">•</span>
        <a href={`${SITE}/instructions`} className="underline decoration-dotted hover:text-slate-200">Instructions</a>
        <span aria-hidden="true">•</span>
        <a href={`${SITE}/about`} className="underline decoration-dotted hover:text-slate-200">About</a>
      </nav>
    </main>
  )
}
