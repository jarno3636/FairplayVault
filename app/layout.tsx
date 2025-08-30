// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from './providers'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MiniAppBoot from '@/components/MiniAppBoot'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fairplay-vault.vercel.app').replace(/\/$/, '')

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'FairPlay Vault — Provably-fair USDC pools on Base',
    template: '%s — FairPlay Vault',
  },
  description: 'Create and join commit–reveal USDC pools on Base. Transparent, no VRF required.',
  alternates: { canonical: SITE },
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'FairPlay Vault',
    title: 'FairPlay Vault',
    description: 'Provably-fair USDC pools on Base.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'FairPlay Vault — Provably-fair USDC pools on Base',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FairPlay Vault',
    description: 'Provably-fair USDC pools on Base.',
    images: ['/og.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  applicationName: 'FairPlay Vault',
  category: 'finance',
  other: { 'og:locale': 'en_US' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0B1220' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
}

// Prevent static export from evaluating client hooks without context
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Schema.org JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'FairPlay Vault',
    url: SITE,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    description: 'Create and join provably-fair commit–reveal USDC pools on Base.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }

  // Farcaster Mini App embed metadata (cache-busted assets)
  const miniAppMeta = {
    version: '1',
    imageUrl: `${SITE}/og.png?v=3`,
    button: {
      title: 'FairPlay Vault',
      action: {
        type: 'launch_frame',
        name: 'FairPlay Vault',
        url: `${SITE}/`,
        splashImageUrl: `${SITE}/icon-192.png?v=3`,
        splashBackgroundColor: '#0b1220',
      },
    },
  }

  return (
    <html lang="en">
      <head>
        {/* PWA / Mobile polish */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no,email=no,address=no" />

        {/* Explicit OG image type (some scrapers like it) */}
        <meta property="og:image:type" content="image/png" />

        {/* Preload key marketing assets (nice-to-have; will be ignored if cached) */}
        <link rel="preload" as="image" href="/og.png" />
        <link rel="preload" as="image" href="/icon-192.png" imagesrcset="/icon-192.png 1x, /icon-512.png 2x" />

        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Farcaster Mini App meta (serialized JSON) */}
        <meta name="fc:miniapp" content={JSON.stringify(miniAppMeta)} />
      </head>
      <body className="bg-slate-950 text-slate-100">
        {/* Optional safe-area CSS vars (MiniAppBoot sets these when embedded) */}
        <style>{`
          :root {
            --safe-top: 0px;
            --safe-right: 0px;
            --safe-bottom: 0px;
            --safe-left: 0px;
          }
          header { padding-top: calc(0.75rem + var(--safe-top)); }
          footer { padding-bottom: calc(0.75rem + var(--safe-bottom)); }
        `}</style>

        <Providers>
          <MiniAppBoot />
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
