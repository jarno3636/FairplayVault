'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Address } from 'viem'
import { usePublicClient, useChainId } from 'wagmi'

// Minimal read-only ERC20 ABI
const ERC20_META_ABI = [
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol',   stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const

// simple in-memory cache per chain to avoid re-reads across the app
const metaCache = new Map<string, { symbol: string; decimals: number }>()

export function useTokenMeta(token?: Address, fallback: { symbol?: string; decimals?: number } = {}) {
  const pub = usePublicClient()
  const chainId = useChainId()

  const [symbol, setSymbol] = useState<string>(fallback.symbol ?? 'TOKEN')
  const [decimals, setDecimals] = useState<number>(fallback.decimals ?? 18)
  const [loading, setLoading] = useState<boolean>(!!token)
  const [error, setError] = useState<string | null>(null)

  const key = token ? `${chainId}:${token.toLowerCase()}` : ''

  const readMeta = useCallback(async () => {
    if (!pub || !token) return
    // cache hit?
    const cached = metaCache.get(key)
    if (cached) {
      setSymbol(cached.symbol)
      setDecimals(cached.decimals)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const [dec, sym] = await Promise.all([
        pub.readContract({ address: token, abi: ERC20_META_ABI, functionName: 'decimals' }) as Promise<number>,
        pub.readContract({ address: token, abi: ERC20_META_ABI, functionName: 'symbol' }) as Promise<string>,
      ])
      const normalized = { symbol: sym || (fallback.symbol ?? 'TOKEN'), decimals: Number.isFinite(dec) ? dec : (fallback.decimals ?? 18) }
      metaCache.set(key, normalized)
      setSymbol(normalized.symbol)
      setDecimals(normalized.decimals)
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Failed to load token meta')
      // keep fallbacks
      setSymbol(prev => prev ?? (fallback.symbol ?? 'TOKEN'))
      setDecimals(prev => prev ?? (fallback.decimals ?? 18))
    } finally {
      setLoading(false)
    }
  }, [pub, token, key, fallback.symbol, fallback.decimals])

  useEffect(() => {
    if (!token || !pub) return
    readMeta().catch(() => {})
  }, [token, pub, chainId, readMeta])

  // helpers
  const format = useCallback((amount: bigint | null | undefined) => {
    if (amount == null) return '0'
    // lightweight formatUnits without importing viem helpers
    const d = BigInt(decimals)
    const s = amount.toString()
    if (d === 0n) return s
    const neg = s.startsWith('-')
    const raw = neg ? s.slice(1) : s
    const pad = raw.padStart(Number(d) + 1, '0')
    const whole = pad.slice(0, -Number(d))
    const frac = pad.slice(-Number(d)).replace(/0+$/, '')
    const out = frac ? `${whole}.${frac}` : whole
    return neg ? `-${out}` : out
  }, [decimals])

  const parse = useCallback((value: string) => {
    // simple parseUnits without floating errors
    const d = decimals
    const [w = '0', f = ''] = value.split('.')
    const frac = (f + '0'.repeat(d)).slice(0, d)
    return BigInt(w) * 10n ** BigInt(d) + BigInt(frac || '0')
  }, [decimals])

  return { symbol, decimals, loading, error, format, parse, refresh: readMeta }
}
