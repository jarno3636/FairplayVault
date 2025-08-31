/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { optimizePackageImports: ['viem', 'wagmi'] },

  async headers() {
    return [
      // Farcaster domain manifest: correct type + short cache
      {
        source: '/.well-known/farcaster.json',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=60' },
        ],
      },

      // Frame endpoint: served as HTML with vNext meta (cache at the edge)
      {
        // covers both GET and POST to /api/frame and any querystring
        source: '/api/frame',
        headers: [
          { key: 'Content-Type', value: 'text/html; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=86400' },
          { key: 'Vary', value: 'Accept' },
        ],
      },

      // Default site-wide security + iframe allowlist for Warpcast/Farcaster
      {
        source: '/(.*)',
        headers: [
          // DO NOT set X-Frame-Options (leave absent so embedding works)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://warpcast.com https://*.warpcast.com https://farcaster.xyz https://*.farcaster.xyz;",
          },
        ],
      },
    ]
  },
}

export default nextConfig
