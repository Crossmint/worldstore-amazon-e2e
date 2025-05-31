'use client';

import { Web3Provider } from './Web3Provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Web3Provider>
      {children}
    </Web3Provider>
  );
} 