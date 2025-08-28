'use client'

import { Address, parseAbi } from 'viem'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { ERC20_ABI } from '@/lib/abi/erc20'
import toast from 'react-hot-toast'

const erc20 = parseAbi(ERC20_ABI)

export default function ApproveAndCall({
  token, spender, amount, onApproveDone, className
}: { token: Address; spender: Address; amount: bigint; onApproveDone?: () => void; className?: string }) {
  const { address } = useAccount()
  const pub = usePublicClient()
  const { data: wallet } = useWalletClient()

  async function ensureAllowance() {
    try {
      if (!address || !wallet) throw new Error('Connect wallet')
      const allowance = await pub!.readContract({ address: token, abi: erc20, functionName: 'allowance', args: [address, spender] }) as bigint
      if (allowance >= amount) { onApproveDone?.(); return }
      const sim = await pub!.simulateContract({ address: token, abi: erc20, functionName: 'approve', args: [spender, amount], account: wallet.account! })
      const tx = await wallet.writeContract(sim.request)
      await pub!.waitForTransactionReceipt({ hash: tx })
      toast.success('Approved')
      onApproveDone?.()
    } catch (e:any) {
      toast.error(e.message || String(e))
    }
  }

  return <button className={className || 'btn'} onClick={ensureAllowance}>Approve USDC</button>
}
