// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { optimizePackageImports: ['viem', 'wagmi'] },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // ❌ remove X-Frame-Options
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },

          // ✅ allow embedding by Warpcast / Farcaster
          {
            key: 'Content-Security-Policy',
            // If you already have a CSP, MERGE this directive into it.
            value:
              "frame-ancestors 'self' https://warpcast.com https://*.warpcast.com https://farcaster.xyz https://*.farcaster.xyz;"
          }
        ]
      }
    ]
  }
};
export default nextConfig;
