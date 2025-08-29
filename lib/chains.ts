import { defineChain } from 'viem'

export const base = defineChain({
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Basescan',
      url: process.env.NEXT_PUBLIC_EXPLORER || 'https://basescan.org',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11', // ✅ multicall3
      blockCreated: 5022, // earliest deployment block on Base
    },
  },
})
