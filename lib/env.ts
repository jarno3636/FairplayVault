export const env = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453),
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org',
  explorer: process.env.NEXT_PUBLIC_EXPLORER || 'https://basescan.org',
  vault: (process.env.NEXT_PUBLIC_VAULT_ADDRESS || '').toLowerCase(),
  wcProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID || '',
  sentinelUrl: process.env.NEXT_PUBLIC_SENTINEL_URL || '',
  // NEW (all optional)
  fixedBuilderFeeBps: Number(process.env.NEXT_PUBLIC_BUILDER_FEE_BPS ?? 200),   // 2%
  fixedProtocolFeeBps: Number(process.env.NEXT_PUBLIC_PROTOCOL_FEE_BPS ?? 100), // 1%
  builderFeeRecipient: (process.env.NEXT_PUBLIC_BUILDER_FEE_RECIPIENT || '').toLowerCase(), // if empty, defaults to creator wallet
}
