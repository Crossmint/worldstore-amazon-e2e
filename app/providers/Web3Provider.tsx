'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { useEffect, useState } from 'react';
import { WALLET_CONFIG } from '../config/wallet';
import { walletConnect } from 'wagmi/connectors';
import { createWeb3Modal } from '@web3modal/wagmi/react';

const chains = [sepolia] as const;

// Create the config outside of the component
const config = createConfig({
  chains,
  transports: {
    [sepolia.id]: http()
  },
  connectors: [
    walletConnect({
      projectId: WALLET_CONFIG.projectId,
      metadata: {
        name: WALLET_CONFIG.appName,
        description: WALLET_CONFIG.appDescription,
        url: WALLET_CONFIG.appUrl,
        icons: [WALLET_CONFIG.appIcon]
      },
      showQrModal: true
    })
  ]
});

// Initialize Web3Modal outside of the component
if (WALLET_CONFIG.projectId) {
  // Clear any stale sessions by creating a new instance
  createWeb3Modal({
    wagmiConfig: config,
    projectId: WALLET_CONFIG.projectId,
    defaultChain: sepolia,
    themeMode: 'light'
  });
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        if (!WALLET_CONFIG.projectId) {
          throw new Error('Missing NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID environment variable');
        }
        setReady(true);
      } catch (error) {
        console.error('Failed to initialize Web3Modal:', error);
      }
    };

    init();
  }, []);

  if (!ready) {
    return null;
  }

  return <WagmiProvider config={config}>{children}</WagmiProvider>;
} 