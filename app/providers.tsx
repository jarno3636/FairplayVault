'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { env } from '@/lib/env'
import { base } from '@/lib/chains'
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider, http } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

const queryClient = new QueryClient()

const config = getDefaultConfig({
  appName: 'Fairplay',
  projectId: env.wcProjectId || 'demo',
  chains: [base],
  transports: { [base.id]: http(env.rpcUrl) },
  ssr: true
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#22D3EE' })}>
          {children}
          <Toaster position="bottom-right" />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
