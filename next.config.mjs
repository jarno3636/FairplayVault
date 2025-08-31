/// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Speeds up bundle by tree-shaking these libs
  experimental: { optimizePackageImports: ['viem', 'wagmi'] },

  async headers() {
    return [
      // ---- Default security + embed policy (site-wide) ----
      {
        source: '/:path*',
        headers: [
          // DO NOT set X-Frame-Options (would block embedding)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },

          // Allow Warpcast/Farcaster to iframe your app
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://warpcast.com https://*.warpcast.com https://farcaster.xyz https://*.farcaster.xyz;"
          },
        ],
      },

      // ---- Cache the Mini App card & OG images aggressively (bust with ?v=) ----
      {
        source: '/:file(og|miniapp-card)\\.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },

      // ---- Cache app icons strongly too ----
      {
        source: '/:file(icon-192|icon-512|apple-touch-icon|favicon-32x32|favicon-16x16)\\.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },

      // ---- Farcaster well-known manifest: short cache so updates propagate ----
      {
        source: '/.well-known/farcaster.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=300' },
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
        ],
      },
    ]
  },
}

export default nextConfig
