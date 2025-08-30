/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { optimizePackageImports: ['viem', 'wagmi'] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // DO NOT set X-Frame-Options at all (it overrides frame-ancestors)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },

          // Allow Warpcast/Farcaster and (optionally) your Vercel preview URLs to iframe your app
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self';",
              // allow frames from Warpcast / Farcaster
              "frame-ancestors 'self' https://warpcast.com https://*.warpcast.com https://farcaster.xyz https://*.farcaster.xyz;",
            ].join(' ')
          }
        ]
      }
    ]
  }
}
export default nextConfig
