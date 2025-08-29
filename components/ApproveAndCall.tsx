'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import type { Address } from 'viem'
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi'
import toast from 'react-hot-toast'
import { useTokenMeta } from '@/hooks/useTokenMeta'

// Minimal ERC20 ABI (JSON) for allowance/approve (read meta via hook)
const ERC20_MIN_ABI = [
  { type: 'function', name: 'allowance', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }],
    outputs: [{ type: 'bool' }] },
] as const

const MAX_UINT256 = (2n ** 256n) - 1n
const BASE_CHAIN_ID = 8453

type Props = {
  token: Address
  spender: Address
  amount: bigint
  className?: string
  requireBase?: boolean
  infinite?: boolean
  onApproveDone?: (txHash?: `0x${string}`) => void
}

export default function ApproveAndCall({
  token,
  spender,
  amount,
  className,
  requireBase = true,
  infinite: infiniteProp = true,
  onApproveDone,
}: Props) {
  const pub = usePublicClient()
  const { data: wallet } = useWalletClient()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()

  // Token meta (cached app-wide): symbol/decimals + formatter
  const { symbol, decimals, format: fmt } = useTokenMeta(token, { symbol: 'USDC', decimals: 6 })

  // Local state
  const [allowance, setAllowance] = useState<bigint>(0n)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [infinite, setInfinite] = useState<boolean>(infiniteProp)

  // Derived
  const needsApproval = useMemo(() => allowance < amount, [allowance, amount])
  const disabled = useMemo(
    () => !isConnected || !pub || amount <= 0n || loading || checking,
    [isConnected, pub, amount, loading, checking]
  )

  // Read current allowance
  const readAllowance = useCallback(async () => {
    if (!pub || !address) { setAllowance(0n); return }
    try {
      setChecking(true)
      const a = await pub.readContract({
        address: token,
        abi: ERC20_MIN_ABI,
        functionName: 'allowance',
        args: [address, spender],
      }) as bigint
      setAllowance(a)
    } catch {
      // non-fatal
    } finally {
      setChecking(false)
    }
  }, [pub, address, token, spender])

  // Refresh on mount & when important inputs change
  useEffect(() => { readAllowance().catch(() => {}) }, [readAllowance])
  useEffect(() => { readAllowance().catch(() => {}) }, [amount])          // amount change may alter needsApproval
  useEffect(() => { readAllowance().catch(() => {}) }, [chainId])         // network changes

  // Optional network guard (Base)
  const ensureBase = useCallback(async () => {
    if (!requireBase) return true
    if (chainId === BASE_CHAIN_ID) return true
    if (!wallet?.switchChain) {
      toast.error('Wrong network. Please switch to Base.')
      return false
    }
    try {
      await wallet.switchChain({ id: BASE_CHAIN_ID })
      toast.success('Switched to Base')
      return true
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || 'Switch failed')
      return false
    }
  }, [chainId, wallet, requireBase])

  // Approve action
  async function approve() {
    if (!isConnected || !wallet) return toast.error('Connect wallet')
    if (!pub) return toast.error('Network not ready')
    if (amount <= 0n) return toast.error(`Set a ${symbol} amount first`)
    if (!(await ensureBase())) return

    if (!needsApproval) { onApproveDone?.(); return }

    setLoading(true)
    try {
      const value = infinite ? MAX_UINT256 : amount
      const sim = await pub.simulateContract({
        address: token,
        abi: ERC20_MIN_ABI,
        functionName: 'approve',
        args: [spender, value],
        account: wallet.account!,
      })
      const hash = await wallet.writeContract(sim.request)
      await pub.waitForTransactionReceipt({ hash })

      toast.success(`Approved ${infinite ? 'infinite ' : ''}${symbol}`)
      onApproveDone?.(hash)
      await readAllowance() // refresh; some tokens clamp or reset allowance patterns
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || 'Approval failed')
    } finally {
      setLoading(false)
    }
  }

  // Button label
  const label = useMemo(() => {
    if (!isConnected) return `Connect wallet`
    if (amount <= 0n) return `Enter amount`
    if (checking) return `Checking ${symbol}…`
    if (needsApproval) return `Approve ${symbol}${infinite ? ' (∞)' : ''}`
    return `Approved`
  }, [isConnected, amount, checking, needsApproval, symbol, infinite])

  return (
    <div className="flex flex-col gap-1">
      <button
        className={className || (needsApproval ? 'btn' : 'btn-ghost')}
        onClick={approve}
        disabled={disabled || !needsApproval}
        title={
          !isConnected ? 'Connect wallet'
            : amount <= 0n ? 'Amount required'
            : undefined
        }
      >
        {loading ? 'Approving…' : label}
      </button>

      {/* extras */}
      <div className="text-xs text-slate-400 flex items-center gap-3">
        <span>Allowance: {fmt(allowance)} {symbol}</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={infinite}
            onChange={() => setInfinite(v => !v)}
          />
          Infinite
        </label>
      </div>
    </div>
  )
}
