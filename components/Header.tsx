'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { cn } from '@/lib/utils'
import { useAccount } from 'wagmi'
import { isAdminAddress } from '@/lib/admin'

export default function Header() {
  const pathname = usePathname() ?? ''
  const { address } = useAccount()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isAdmin = mounted && isAdminAddress(address)
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href + '/'))

  const nav = [
    { href: '/', label: 'Home' },
    ...(isAdmin ? [{ href: '/fees', label: 'Fees' }] : []),
    { href: '/products', label: 'Products' },
    { href: '/instructions', label: 'Instructions' },
    { href: '/about', label: 'About' },
  ]

  const cbwalletUrl =
    'cbwallet://dapp?url=https%3A%2F%2Ffairplay-vault.vercel.app'

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.PNG"
            alt="FairPlay Vault Logo"
            width={32}
            height={32}
            className="rounded-md"
            priority
          />
          <span className="text-lg font-semibold tracking-tight">FairPlay Vault</span>
        </Link>

        <nav className="ml-auto hidden gap-1 md:flex items-center">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition',
                isActive(n.href) && 'bg-white/10 text-white'
              )}
            >
              {n.label}
            </Link>
          ))}

          {/* Coinbase Wallet deep link */}
          <a
            href={cbwalletUrl}
            className="ml-2 rounded-full bg-cyan-500/20 text-cyan-300 px-3 py-1.5 text-sm hover:bg-cyan-500/30 transition"
          >
            Open in Coinbase Wallet
          </a>
        </nav>

        <div className="ml-2 hidden md:block">
          <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-controls="mobile-nav"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="ml-auto inline-flex items-center justify-center rounded-lg p-2 ring-1 ring-white/10 hover:bg-white/5 md:hidden"
        >
          <svg className={cn('h-5 w-5', open ? 'hidden' : 'block')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <svg className={cn('h-5 w-5', open ? 'block' : 'hidden')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M6 6l12 12M18 6l-12 12" />
          </svg>
        </button>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          'md:hidden border-t border-white/10 bg-slate-950/80 backdrop-blur transition-[max-height,opacity] duration-200 overflow-hidden',
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="mx-auto max-w-6xl px-4 py-3">
          <nav className="flex flex-col gap-1">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition',
                  isActive(n.href) && 'bg-white/10 text-white'
                )}
              >
                {n.label}
              </Link>
            ))}

            {/* Coinbase Wallet deep link (mobile) */}
            <a
              href={cbwalletUrl}
              className="rounded-lg px-3 py-2 text-sm text-cyan-300 bg-cyan-500/20 hover:bg-cyan-500/30 transition"
            >
              Open in Coinbase Wallet
            </a>
          </nav>

          <div className="mt-3">
            <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
          </div>
        </div>
      </div>
    </header>
  )
}
