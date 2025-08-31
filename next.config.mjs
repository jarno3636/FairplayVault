/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { optimizePackageImports: ['viem', 'wagmi'] },
  async headers() {
    return [
      // Global defaults (no X-Frame-Options; allow Warpcast/Farcaster to iframe)
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Deny hardware by default (you can loosen later if you add camera/mic features)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://warpcast.com https://*.warpcast.com https://farcaster.xyz https://*.farcaster.xyz;"
          }
        ]
      },

      // Mini page: optional explicit rule (same CSP; keeps things scoped)
      {
        source: '/mini',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://warpcast.com https://*.warpcast.com https://farcaster.xyz https://*.farcaster.xyz;"
          },
          // Avoid aggressive edge caching for the embed HTML
          { key: 'Cache-Control', value: 'no-store' }
        ]
      },

      // Farcaster domain association JSON — serve as JSON and avoid stale cache
      {
        source: '/.well-known/farcaster.json',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-store' }
        ]
      },

      // Card image: long cache; you’ll bust with ?v=… in your layout
      {
        source: '/miniapp-card.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      }
    ]
  }
};

export default nextConfig;
