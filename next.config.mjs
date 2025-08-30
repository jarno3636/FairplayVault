/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { optimizePackageImports: ['viem', 'wagmi'] },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Do NOT set X-Frame-Options (leave it out completely)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Allow Warpcast + Farcaster Mini Apps to iframe your site
          {
            key: 'Content-Security-Policy',
            value: [
              "frame-ancestors 'self'",
              'https://warpcast.com',
              'https://*.warpcast.com',
              'https://farcaster.xyz',
              'https://*.farcaster.xyz',
              'https://miniapps.farcaster.xyz',
              'https://farcaster-mini-apps.web.app',
            ].join(' ') + ';'
          }
        ]
      }
    ]
  }
}
export default nextConfig
