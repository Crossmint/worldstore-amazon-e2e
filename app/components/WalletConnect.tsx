'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletConnect() {
  const { address: walletAddress } = useAccount();

  return (
    <div className="flex flex-col">
      <ConnectButton 
        showBalance={false}
        chainStatus="full"
      />
    </div>
  );
} 