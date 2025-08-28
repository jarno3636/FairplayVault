'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ShieldCheck, Wallet, Ticket, Info, BookText } from 'lucide-react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

const nav = [
  { href: '/', label: 'Pools', icon: Ticket },
  { href: '/about', label: 'About', icon: Info },
  { href: '/instructions', label: 'How it works', icon: BookText },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 bg-slate-900/80 border-b border-slate-800">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-16 grid grid-cols-2 sm:grid-cols-3 items-center gap-3">
          {/* left: brand */}
          <Link href="/" className="flex items-center gap-2 text-sky-300 hover:text-sky-200 transition">
            <motion.span
              initial={{ rotate: -10, scale: 0.9, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-400/30"
            >
              <ShieldCheck className="h-5 w-5" />
            </motion.span>
            <div className="leading-tight">
              <div className="font-semibold text-slate-100">Fairplay</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Commit–Reveal</div>
            </div>
          </Link>

          {/* center: nav */}
          <nav className="hidden sm:flex items-center justify-center gap-1">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ring-1',
                    active
                      ? 'bg-slate-800 text-sky-300 ring-slate-700'
                      : 'text-slate-300 ring-slate-800 hover:bg-slate-800/60 hover:text-slate-100'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* right: connect */}
          <div className="flex items-center justify-end">
            <div className="hidden sm:flex items-center gap-2 mr-2 text-xs text-slate-400">
              <Wallet className="h-4 w-4" />
              Base
            </div>
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  )
}
