// app/mini/layout.tsx
import type { Metadata } from 'next'
import '../globals.css' // reuse base styles; avoid Providers/Header/Footer here

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fairplay-vault.vercel.app').replace(/\/$/, '')

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'FairPlay Vault — Mini App',
  description: 'Lightweight mini view for Farcaster.',
  openGraph: {
    type: 'website',
    url: `${SITE}/mini`,
    title: 'FairPlay Vault — Mini App',
    description: 'Lightweight mini view for Farcaster.',
    images: [{ url: `${SITE}/miniapp-card.png`, width: 1200, height: 800 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FairPlay Vault — Mini App',
    description: 'Lightweight mini view for Farcaster.',
    images: [`${SITE}/miniapp-card.png`],
  },
  // keep it simple: no icons/manifest needed for this embedded view
}

export default function MiniLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Keep head tiny; no Providers, no RainbowKit, no frame SDK needed here */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Optional: small CSS for safe-area just in case */}
        <style>{`
          :root{ --safe-top:0px; --safe-right:0px; --safe-bottom:0px; --safe-left:0px; }
          header{ padding-top: calc(0.75rem + var(--safe-top)); }
          footer{ padding-bottom: calc(0.75rem + var(--safe-bottom)); }
        `}</style>
      </head>
      <body className="bg-slate-950 text-slate-100">
        {/* Intentionally no <Header/> / <Footer/> / Providers here */}
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  )
}
