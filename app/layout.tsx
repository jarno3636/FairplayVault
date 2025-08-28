import './globals.css'
import { Providers } from './providers'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export const metadata = { title: 'Fairplay', description: 'Provably-fair pools on Base' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container py-6 space-y-6">
          <header className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-cyan-400" />
              <div>
                <div className="text-lg font-semibold">Fairplay</div>
                <div className="text-xs text-slate-400">Base</div>
              </div>
            </a>
            <nav className="flex items-center gap-3">
              <a className="btn-secondary" href="/fees">Fees</a>
              <ConnectButton />
            </nav>
          </header>
          <Providers>{children}</Providers>
          <footer className="text-center text-sm text-slate-500 py-8">© {new Date().getFullYear()} Fairplay</footer>
        </div>
      </body>
    </html>
  )
}
