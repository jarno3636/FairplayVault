import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-800 bg-slate-950/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 text-sm text-slate-400">
        <div className="flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-slate-200">Fairplay</div>
            <div className="text-xs">Provably-fair commit–reveal USDC pools on Base.</div>
          </div>
          <nav className="flex flex-wrap items-center gap-4">
            <Link href="/about" className="hover:text-slate-200">About</Link>
            <Link href="/instructions" className="hover:text-slate-200">How it works</Link>
            <a href={process.env.NEXT_PUBLIC_EXPLORER || 'https://basescan.org'} target="_blank" className="hover:text-slate-200">Explorer</a>
            <a href="https://github.com/" target="_blank" className="hover:text-slate-200">GitHub</a>
            <a href="mailto:hello@example.com" className="hover:text-slate-200">Contact</a>
          </nav>
        </div>
        <div className="mt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} Fairplay Labs. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
