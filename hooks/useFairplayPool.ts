'use client'

import { useEffect, useState, useCallback } from 'react'
import { Address } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'
import { env } from '@/lib/env'
import { FAIRPLAY_VAULT_ABI } from '@/lib/abi/FairplayVault'

type PoolTuple = any // keep your existing type if you have one

const abi = FAIRPLAY_VAULT_ABI
const vaultAddress = env.vault as Address

export function useFairplayPool(poolId: bigint) {
  const pub = usePublicClient()
  const { data: wallet } = useWalletClient()

  const [pool, setPool] = useState<PoolTuple | null>(null)
  const [blockTs, setBlockTs] = useState<number | null>(null)
  const [err, setErr] = useState<Error | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const refresh = useCallback(async () => {
    // ---- Guard for TS: bail if client not ready
    if (!pub) {
      setErr(new Error('Public client not ready'))
      return
    }
    try {
      setLoading(true)
      setErr(null)
      const [p, blk] = await Promise.all([
        pub.readContract({ address: vaultAddress, abi, functionName: 'pools', args: [poolId] }) as Promise<PoolTuple>,
        pub.getBlock({ blockTag: 'latest' }),
      ])
      setPool(p)
      setBlockTs(Number(blk.timestamp))
    } catch (e: any) {
      setErr(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [pub, poolId])

  useEffect(() => {
    // only try when pub exists
    if (!pub) return
    refresh().catch(() => {})
  }, [pub, refresh])

  // Example write helper with same guard
  const enter = useCallback(
    async (qty: number) => {
      if (!pub) throw new Error('Public client not ready')
      if (!wallet) throw new Error('Connect wallet')
      const sim = await pub.simulateContract({
        address: vaultAddress,
        abi,
        functionName: 'enter',
        args: [poolId, qty],
        account: wallet.account!,
      })
      const hash = await wallet.writeContract(sim.request)
      await pub.waitForTransactionReceipt({ hash })
    },
    [pub, wallet, poolId]
  )

  return { pool, blockTs, loading, err, refresh, enter }
}
