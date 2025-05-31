'use client';

import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  sepolia,
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { WALLET_CONFIG } from '../config/wallet';
import { BalanceProvider } from '../contexts/BalanceContext';

const config = getDefaultConfig({
  appName: WALLET_CONFIG.appName,
  projectId: WALLET_CONFIG.projectId,
  chains: [sepolia],
  ssr: true, // Required for Next.js
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <BalanceProvider>
            {children}
          </BalanceProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 