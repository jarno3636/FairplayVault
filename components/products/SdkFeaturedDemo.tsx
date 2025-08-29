'use client'

import ProductCard from './ProductCard'
import CopyCode from './CopyCode'

const installNpm = `npm i @fairplaylabs/sdk viem wagmi`
const installYarn = `yarn add @fairplaylabs/sdk viem wagmi`
const installPnpm = `pnpm add @fairplaylabs/sdk viem wagmi`

// Adjust package name if different (e.g. @fairplay/sdk)
const usageCode = `// basic usage with wagmi/viem
import { createFairplayClient } from '@fairplaylabs/sdk'
import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { parseAbi } from 'viem'

// Vault ABI (minimal) or import from your app
const FAIRPLAY_VAULT_ABI = parseAbi([
  "function createPool((uint64,uint64,uint64,uint32,uint32,uint96,uint16,uint16,bytes32,uint96,address,bytes32,uint96,address)) returns (uint256)",
  "function enter(uint256 poolId,uint32 quantity)",
  "function revealCreator(uint256 poolId,bytes32 salt)",
  "function pools(uint256) view returns (address creator,address builderFeeRecipient,uint64 deadline,uint64 revealDeadline,uint64 sentinelRevealDeadline,uint32 maxEntries,uint32 minEntries,uint96 entryPrice,uint16 builderFeeBps,uint16 protocolFeeBps,bytes32 creatorCommitHash,bytes32 sentinelCommitHash,address sentinel,uint96 creatorBond,uint96 sentinelBond,uint32 entries,bool creatorRevealed,bool sentinelRevealed,bool drawn,bool canceled,address winner,bytes32 _creatorSalt,bytes32 _sentinelSalt,uint128 grossCollected)"
])

// wagmi config (Base)
export const wagmiConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http(process.env.NEXT_PUBLIC_RPC_URL) },
})

// SDK client
export const fp = createFairplayClient({
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453),
  vaultAddress: (process.env.NEXT_PUBLIC_VAULT_ADDRESS || '').toLowerCase(),
  wagmiConfig,
  abi: FAIRPLAY_VAULT_ABI,
})

// Example: create a pool
// const { poolId } = await fp.createPool({
//   deadline, revealDeadline, sentinelRevealDeadline,
//   maxEntries, minEntries, entryPrice,
//   builderFeeBps, protocolFeeBps,
//   creatorCommitHash, creatorBond,
//   sentinel, sentinelCommitHash, sentinelBond,
//   builderFeeRecipient,
// })
`

export default function SdkFeaturedDemo() {
  return (
    <ProductCard
      title="Fairplay SDK (Featured)"
      subtitle="Typed helpers for building Fairplay apps on Base with viem + wagmi."
      // Show usage snippet in the built-in expandable code area
      code={usageCode}
      // Use the demo area for install commands and quick facts
      demo={
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="font-medium">Install</div>
            <div className="flex gap-2">
              <CopyCode code={installNpm} />
              <CopyCode code={installYarn} />
              <CopyCode code={installPnpm} />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <code className="rounded-md bg-black/40 p-2 text-xs">npm i @fairplaylabs/sdk viem wagmi</code>
            <code className="rounded-md bg-black/40 p-2 text-xs">yarn add @fairplaylabs/sdk viem wagmi</code>
            <code className="rounded-md bg-black/40 p-2 text-xs">pnpm add @fairplaylabs/sdk viem wagmi</code>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 p-3">
              <div className="text-xs text-slate-400">Network</div>
              <div className="mt-1 font-medium">Base (8453)</div>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <div className="text-xs text-slate-400">Requires</div>
              <div className="mt-1 font-medium">viem · wagmi · env</div>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <div className="text-xs text-slate-400">Includes</div>
              <div className="mt-1 font-medium">Create · Enter · Reveal · Read</div>
            </div>
          </div>

          <div className="mt-2 text-xs text-slate-400">
            Env needed: <code>NEXT_PUBLIC_CHAIN_ID</code>, <code>NEXT_PUBLIC_RPC_URL</code>, <code>NEXT_PUBLIC_VAULT_ADDRESS</code>.
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className="btn"
              href="https://github.com/fairplaylabs/sdk" // update if different
              target="_blank"
            >
              GitHub
            </a>
            <a
              className="btn-secondary"
              href="/docs/sdk" // update if you publish docs
            >
              Docs
            </a>
            <a
              className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
              href="https://www.npmjs.com/package/@fairplaylabs/sdk"
              target="_blank"
            >
              NPM
            </a>
          </div>
        </div>
      }
    />
  )
}
