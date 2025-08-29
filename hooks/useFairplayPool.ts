'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Address } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'
import { env } from '@/lib/env'
import { FAIRPLAY_VAULT_ABI } from '@/lib/abi/FairplayVault'

// If you have a real tuple type for pools, use it here
type PoolTuple = any

const abi = FAIRPLAY_VAULT_ABI
const vaultAddress = env.vault as Address

export function useFairplayPool(poolId: bigint) {
  const pub = usePublicClient()
  const { data: wallet } = useWalletClient()

  const [pool, setPool] = useState<PoolTuple | null>(null)
  const [blockTs, setBlockTs] = useState<number | null>(null)
  const [err, setErr] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  // ---------- reads ----------
  const refresh = useCallback(async () => {
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

  // helper reads for the Fees page
  const getProtocolFeeRecipient = useCallback(async (): Promise<Address> => {
    if (!pub) throw new Error('Public client not ready')
    return (await pub.readContract({
      address: vaultAddress,
      abi,
      functionName: 'protocolFeeRecipient',
    })) as Address
  }, [pub])

  const getProtocolFeesOf = useCallback(
    async (who: Address) => {
      if (!pub) throw new Error('Public client not ready')
      return (await pub.readContract({
        address: vaultAddress,
        abi,
        functionName: 'protocolFees',
        args: [who],
      })) as bigint
    },
    [pub]
  )

  const getBuilderFeesOf = useCallback(
    async (who: Address) => {
      if (!pub) throw new Error('Public client not ready')
      return (await pub.readContract({
        address: vaultAddress,
        abi,
        functionName: 'builderFees',
        args: [who],
      })) as bigint
    },
    [pub]
  )

  // ---------- writes ----------
  const enter = useCallback(
    async (qty: number) => {
      const client = pub
      if (!client) throw new Error('Public client not ready')
      if (!wallet) throw new Error('Connect wallet')

      try {
        const sim = await client.simulateContract({
          address: vaultAddress,
          abi,
          functionName: 'enter',
          args: [poolId, qty],
          account: wallet.account!,
        })
        const hash = await wallet.writeContract(sim.request)
        await client.waitForTransactionReceipt({ hash })
      } catch (e: any) {
        // viem will include .shortMessage like "NothingToWithdraw()" / "NotOwner()"
        const msg = e?.shortMessage || e?.message || String(e)
        throw new Error(msg)
      }
    },
    [pub, wallet, poolId]
  )

  const withdrawProtocolFees = useCallback(
    async (to: Address) => {
      const client = pub
      if (!client) throw new Error('Public client not ready')
      if (!wallet) throw new Error('Connect wallet')

      try {
        const sim = await client.simulateContract({
          address: vaultAddress,
          abi,
          functionName: 'withdrawProtocolFees',
          args: [to],
          account: wallet.account!,
        })
        const hash = await wallet.writeContract(sim.request)
        await client.waitForTransactionReceipt({ hash })
      } catch (e: any) {
        const msg = e?.shortMessage || e?.message || String(e)
        throw new Error(msg)
      }
    },
    [pub, wallet]
  )

  const withdrawBuilderFees = useCallback(
    async (to: Address) => {
      const client = pub
      if (!client) throw new Error('Public client not ready')
      if (!wallet) throw new Error('Connect wallet')

      try {
        const sim = await client.simulateContract({
          address: vaultAddress,
          abi,
          functionName: 'withdrawBuilderFees',
          args: [to],
          account: wallet.account!,
        })
        const hash = await wallet.writeContract(sim.request)
        await client.waitForTransactionReceipt({ hash })
      } catch (e: any) {
        const msg = e?.shortMessage || e?.message || String(e)
        throw new Error(msg)
      }
    },
    [pub, wallet]
  )

  return {
    // existing
    pool,
    blockTs,
    loading,
    err,
    refresh,
    enter,

    // new fee helpers
    getProtocolFeeRecipient,
    getProtocolFeesOf,
    getBuilderFeesOf,
    withdrawProtocolFees,
    withdrawBuilderFees,
  }
}
