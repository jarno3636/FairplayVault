/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { optimizePackageImports: ['viem', 'wagmi'] },
  async headers() {
    return [
      {
        source: '/.well-known/farcaster.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          // low TTL so updates propagate fast; adjust later if you like
          { key: 'Cache-Control', value: 'public, max-age=120, s-maxage=120' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://warpcast.com https://*.warpcast.com https://farcaster.xyz https://*.farcaster.xyz;"
          },
        ],
      },
    ]
  },
}
export default nextConfig
