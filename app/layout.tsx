// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from './providers'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

// Use your public site URL for absolute OG/canonical URLs
const SITE =
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://fairplay-vault.vercel.app').replace(/\/$/, '')

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'FairPlay Vault — Provably-fair USDC pools on Base',
    template: '%s — FairPlay Vault',
  },
  description:
    'Create and join commit–reveal USDC pools on Base. Transparent, no VRF required.',
  alternates: {
    canonical: SITE,
  },
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'FairPlay Vault',
    title: 'FairPlay Vault',
    description: 'Provably-fair USDC pools on Base.',
    images: [
      {
        url: '/og.png', // place a 1200x630 image at public/og.png
        width: 1200,
        height: 630,
        alt: 'FairPlay Vault — Provably-fair USDC pools on Base',
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
  other: {
    'og:locale': 'en_US',
  },
}

export const viewport: Viewport = {
  themeColor: '#0B1220', // matches your dark bg
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
}

// Prevent static export from evaluating client hooks without context
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        <Providers>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
