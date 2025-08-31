'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function MiniPage() {
  const router = useRouter()

  useEffect(() => {
    // send the user straight to your real app inside the frame
    router.replace('/')
  }, [router])

  // tiny “loading” fallback (brief)
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
      <p className="text-slate-300">Loading…</p>
    </main>
  )
}
