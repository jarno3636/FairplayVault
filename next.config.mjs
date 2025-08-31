// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',

  // Optional: safe defaults; add any remote image hosts you actually use
  images: {
    domains: ['warpcast.com', 'imagedelivery.net', 'res.cloudinary.com', 'fairplay-vault.vercel.app'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },

  async headers() {
    return [
      // Global headers (no X-Frame-Options; rely on CSP)
      {
        source: '/(.*)',
        headers: [
          // ❗ Do NOT set X-Frame-Options (omit it or browsers may prefer it over CSP)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },

          // Allow embedding inside Warpcast + Farcaster
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://warpcast.com https://*.warpcast.com https://farcaster.xyz https://*.farcaster.xyz;"
          },
        ],
      },

      // Make sure the farcaster manifest is served as JSON and cacheable
      {
        source: '/.well-known/farcaster.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },

      // Optional: discourage search engines on the mini landing (not required)
      {
        source: '/mini',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex,follow' }],
      },
    ]
  },

  // Keep webpack minimal; no Node polyfills on client
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      net: false,
      tls: false,
    }
    return config
  },

  env: {
    NEXT_PUBLIC_APP_NAME: 'FairPlay Vault',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  experimental: {
    // You’re already using this pattern elsewhere
    optimizePackageImports: ['viem', 'wagmi'],
    esmExternals: true,
  },

  async redirects() {
    return [
      // Handy cleanups if you ever need them; safe to remove
      { source: '/home', destination: '/', permanent: true },
    ]
  },
}

export default nextConfig
