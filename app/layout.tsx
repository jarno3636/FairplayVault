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
    images: [{ url: `${SITE}/og.png`, width: 1200, height: 630, alt: 'FairPlay Vault — Provably-fair USDC pools on Base' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FairPlay Vault',
    description: 'Provably-fair USDC pools on Base.',
    images: [`${SITE}/og.png`],
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
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  applicationName: 'FairPlay Vault',
  category: 'finance',
  other: { 'og:locale': 'en_US' },
}

export const viewport: Viewport = {
  themeColor: '#0B1220',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
}

export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <html lang="en">
      <head>
        {/* Regular SEO only (no Farcaster meta here) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className="bg-slate-950 text-slate-100">
        <style>{`
          :root { --safe-top: 0px; --safe-right: 0px; --safe-bottom: 0px; --safe-left: 0px; }
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
