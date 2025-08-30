// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // DO NOT set X-Frame-Options anywhere (leave it absent)
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Allow Warpcast/Farcaster to iframe your site
  res.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://warpcast.com https://*.warpcast.com https://farcaster.xyz https://*.farcaster.xyz;"
  )

  return res
}

export const config = {
  matcher: '/:path*',
}
