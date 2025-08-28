// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'FairplayVault',
  description: 'Commit–reveal USDC pools',
}

// Prevent static export from evaluating client hooks without context
export const dynamic = 'force-dynamic'
// (Alternative: export const revalidate = 0)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
