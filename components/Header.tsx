'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/', label: 'Home' },
  { href: '/fees', label: 'Fees' },
  { href: '/instructions', label: 'Instructions' },
  { href: '/about', label: 'About' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        {/* Logo / Title */}
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-cyan-400/20 ring-1 ring-cyan-400/30" />
          <span className="text-lg font-semibold tracking-tight">FairplayVault</span>
        </Link>

        {/* NAV LINKS */}
        <nav className="ml-auto hidden gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition',
                pathname === n.href && 'bg-white/10 text-white'
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* WALLET CONNECT */}
        <div className="ml-2">
          <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
        </div>
      </div>
    </header>
  )
}
