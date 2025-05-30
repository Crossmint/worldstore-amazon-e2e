'use client';

import dynamic from 'next/dynamic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const Web3Provider = dynamic(() => import('./Web3Provider').then(mod => mod.Web3Provider), {
  ssr: false,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Web3Provider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Web3Provider>
  );
} 