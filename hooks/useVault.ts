'use client'

import { useEffect, useState } from 'react'
import { Address, Hex, parseAbi } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'
import { FAIRPLAY_VAULT_ABI } from '@/lib/abi/FairplayVault'
import { env } from '@/lib/env'

const abi = parseAbi(FAIRPLAY_VAULT_ABI)

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

  useEffect(() => {
    pub?.readContract({ address: env.vault as Address, abi, functionName: 'nextPoolId' })
      .then((r:any) => setNextId(r as bigint))
      .catch(()=>{})
  }, [pub])

  async function createPool(cp: CreateParams) {
    if (!wallet) throw new Error('No wallet')
    const sim = await pub!.simulateContract({
      address: env.vault as Address,
      abi, functionName: 'createPool',
      args: [cp], account: wallet.account!
    })
    const tx = await wallet.writeContract(sim.request)
    const rcpt = await pub!.waitForTransactionReceipt({ hash: tx })
    return { hash: tx, poolId: sim.result as bigint, receipt: rcpt }
  }

  async function enter(poolId: bigint, quantity: number) {
    if (!wallet) throw new Error('No wallet')
    const sim = await pub!.simulateContract({
      address: env.vault as Address, abi, functionName: 'enter',
      args: [poolId, quantity], account: wallet.account!
    })
    const tx = await wallet.writeContract(sim.request)
    return await pub!.waitForTransactionReceipt({ hash: tx })
  }

  async function revealCreator(poolId: bigint, salt: Hex) {
    if (!wallet) throw new Error('No wallet')
    const sim = await pub!.simulateContract({
      address: env.vault as Address, abi, functionName: 'revealCreator',
      args: [poolId, salt], account: wallet.account!
    })
    const tx = await wallet.writeContract(sim.request)
    return await pub!.waitForTransactionReceipt({ hash: tx })
  }

  async function finalizeAfterDeadlines(poolId: bigint) {
    if (!wallet) throw new Error('No wallet')
    const sim = await pub!.simulateContract({
      address: env.vault as Address, abi, functionName: 'finalizeAfterDeadlines',
      args: [poolId], account: wallet.account!
    })
    const tx = await wallet.writeContract(sim.request)
    return await pub!.waitForTransactionReceipt({ hash: tx })
  }

  async function withdrawProtocolFees(to: Address) {
    if (!wallet) throw new Error('No wallet')
    const sim = await pub!.simulateContract({ address: env.vault as Address, abi, functionName: 'withdrawProtocolFees', args: [to], account: wallet.account! })
    const tx = await wallet.writeContract(sim.request)
    return await pub!.waitForTransactionReceipt({ hash: tx })
  }

  async function withdrawBuilderFees(to: Address) {
    if (!wallet) throw new Error('No wallet')
    const sim = await pub!.simulateContract({ address: env.vault as Address, abi, functionName: 'withdrawBuilderFees', args: [to], account: wallet.account! })
    const tx = await wallet.writeContract(sim.request)
    return await pub!.waitForTransactionReceipt({ hash: tx })
  }

  return { nextId, createPool, enter, revealCreator, finalizeAfterDeadlines, withdrawProtocolFees, withdrawBuilderFees }
}
