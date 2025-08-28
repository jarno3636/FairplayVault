'use client'

import { useCallback, useEffect, useState } from 'react'
import { Address } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'
import { env } from '@/lib/env'
import { FAIRPLAY_VAULT_ABI } from '@/lib/abi/FairplayVault'

type PoolTuple = any // replace with your tuple type if you defined one

const abi = FAIRPLAY_VAULT_ABI
const vaultAddress = env.vault as Address

export function useFairplayPool(poolId: bigint) {
  const pub = usePublicClient()
  const { data: wallet } = useWalletClient()

  const [pool, setPool] = useState<PoolTuple | null>(null)
  const [blockTs, setBlockTs] = useState<number | null>(null)
  const [err, setErr] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    // Narrow to a local const so TS knows it won't change inside this call
    const client = pub
    if (!client) {
      setErr(new Error('Public client not ready'))
      return
    }
    try {
      setLoading(true)
      setErr(null)
      const [p, blk] = await Promise.all([
        client.readContract({
          address: vaultAddress,
          abi,
          functionName: 'pools',
          args: [poolId],
        }) as Promise<PoolTuple>,
        client.getBlock({ blockTag: 'latest' }),
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
    if (!pub) return
    refresh().catch(() => {})
  }, [pub, refresh])

  const enter = useCallback(
    async (qty: number) => {
      const client = pub
      if (!client) throw new Error('Public client not ready')
      if (!wallet) throw new Error('Connect wallet')
      const sim = await client.simulateContract({
        address: vaultAddress,
        abi,
        functionName: 'enter',
        args: [poolId, qty],
        account: wallet.account!,
      })
      const hash = await wallet.writeContract(sim.request)
      await client.waitForTransactionReceipt({ hash })
    },
    [pub, wallet, poolId]
  )

  return { pool, blockTs, loading, err, refresh, enter }
}
