'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { env } from '@/lib/env'
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit'
import { WagmiProvider, http, useAccount, useChainId, useSwitchChain } from 'wagmi'
import { base } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'

const queryClient = new QueryClient()

// Make sure env.rpcUrl points to a Base RPC (e.g. https://mainnet.base.org)
const config = getDefaultConfig({
  appName: 'FairPlay Vault',
  projectId: env.wcProjectId || 'demo', // real WC v2 projectId recommended
  chains: [base],
  transports: {
    [base.id]: http(env.rpcUrl || 'https://mainnet.base.org'),
  },
  ssr: true,
})

/** Auto-switch to Base after connect (and whenever chain is wrong). */
function AutoSwitchToBase() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending, error, reset } = useSwitchChain()
  const [triedOnce, setTriedOnce] = useState(false)

  useEffect(() => {
    if (!isConnected) {
      setTriedOnce(false)
      reset()
      return
    }
    // If connected to the wrong chain, attempt a switch once.
    if (chainId && chainId !== base.id && !triedOnce && !isPending) {
      setTriedOnce(true)
      // This will request `wallet_switchEthereumChain` (and add Base if needed)
      switchChain({ chainId: base.id }).catch(() => {
        // user may reject; we’ll show a small hint below
      })
    }
  }, [isConnected, chainId, switchChain, triedOnce, isPending, reset])

  // Optional tiny hint if they canceled the switch
  if (isConnected && chainId !== base.id && error) {
    return (
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center p-2">
        <div className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-500/30">
          Please switch your wallet to <b>Base</b> to continue.
        </div>
      </div>
    )
  }
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* initialChain helps RainbowKit pre-select Base in the connect modal */}
        <RainbowKitProvider
          initialChain={base}
          theme={darkTheme({ accentColor: '#22D3EE' })}
        >
          <AutoSwitchToBase />
          {children}
          <Toaster position="bottom-right" />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default Providers
