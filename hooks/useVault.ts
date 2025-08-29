// hooks/useVault.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Address, Hex } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'
import { FAIRPLAY_VAULT_ABI } from '@/lib/abi/FairplayVault'
import { env } from '@/lib/env'

const abi = FAIRPLAY_VAULT_ABI as const
const VAULT = env.vault as Address

export type CreateParams = {
  deadline: bigint;
  revealDeadline: bigint;
  sentinelRevealDeadline: bigint;
  maxEntries: number;
  minEntries: number;
  entryPrice: bigint;
  builderFeeBps: number;
  protocolFeeBps: number;
  creatorCommitHash: Hex;
  creatorBond: bigint;
  sentinel: Address;
  sentinelCommitHash: Hex;
  sentinelBond: bigint;
  builderFeeRecipient: Address;
}

export function useVault() {
  const pub = usePublicClient()
  const { data: wallet } = useWalletClient()
  const [nextId, setNextId] = useState<bigint>(1n)

  // ---- helper to simulate + write with readable errors ----
  const simulateAndWrite = useCallback(async (
    fn: string,
    args: any[]
  ) => {
    if (!pub) throw new Error('Public client not ready')
    if (!wallet) throw new Error('No wallet')
    try {
      const sim = await pub.simulateContract({
        address: VAULT,
        abi,
        functionName: fn as any,
        args,
        account: wallet.account!,
      })
      const hash = await wallet.writeContract(sim.request)
      return await pub.waitForTransactionReceipt({ hash })
    } catch (e: any) {
      // viem adds .shortMessage when ABI includes error types
      const msg = e?.shortMessage || e?.message || String(e)
      throw new Error(msg)
    }
  }, [pub, wallet])

  // ---- reads ----
  useEffect(() => {
    if (!pub) return
    pub.readContract({ address: VAULT, abi, functionName: 'nextPoolId' })
      .then((r: any) => setNextId(r as bigint))
      .catch(() => {})
  }, [pub])

  const getProtocolFeeRecipient = useCallback(async (): Promise<Address> => {
    if (!pub) throw new Error('Public client not ready')
    return await pub.readContract({
      address: VAULT, abi, functionName: 'protocolFeeRecipient',
    }) as Address
  }, [pub])

  const getProtocolFeesOf = useCallback(async (who: Address): Promise<bigint> => {
    if (!pub) throw new Error('Public client not ready')
    return await pub.readContract({
      address: VAULT, abi, functionName: 'protocolFees', args: [who],
    }) as bigint
  }, [pub])

  const getBuilderFeesOf = useCallback(async (who: Address): Promise<bigint> => {
    if (!pub) throw new Error('Public client not ready')
    return await pub.readContract({
      address: VAULT, abi, functionName: 'builderFees', args: [who],
    }) as bigint
  }, [pub])

  // ---- writes ----
  async function createPool(cp: CreateParams) {
    const rcpt = await simulateAndWrite('createPool', [cp])
    // viem returns the simulated return value on sim; if you need it, re-run a read on nextPoolId or watch events
    return rcpt
  }

  async function enter(poolId: bigint, quantity: number) {
    if (quantity <= 0) throw new Error('Quantity must be > 0')
    return await simulateAndWrite('enter', [poolId, quantity])
  }

  async function revealCreator(poolId: bigint, salt: Hex) {
    return await simulateAndWrite('revealCreator', [poolId, salt])
  }

  async function finalizeAfterDeadlines(poolId: bigint) {
    return await simulateAndWrite('finalizeAfterDeadlines', [poolId])
  }

  async function withdrawProtocolFees(to: Address) {
    // (optional pre-checks)
    // const recipient = await getProtocolFeeRecipient()
    // const bal = await getProtocolFeesOf(recipient)
    // if (bal === 0n) throw new Error('Nothing to withdraw')
    return await simulateAndWrite('withdrawProtocolFees', [to])
  }

  async function withdrawBuilderFees(to: Address) {
    // (optional pre-check) const bal = await getBuilderFeesOf(wallet?.account?.address as Address)
    return await simulateAndWrite('withdrawBuilderFees', [to])
  }

  return {
    nextId,
    // reads
    getProtocolFeeRecipient, getProtocolFeesOf, getBuilderFeesOf,
    // writes
    createPool, enter, revealCreator, finalizeAfterDeadlines,
    withdrawProtocolFees, withdrawBuilderFees,
  }
}
