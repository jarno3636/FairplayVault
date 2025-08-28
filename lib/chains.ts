import { defineChain } from 'viem'

export const base = defineChain({
  id: 8453,
  name: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'] } },
  blockExplorers: { default: { name: 'Basescan', url: process.env.NEXT_PUBLIC_EXPLORER || 'https://basescan.org' } }
});
