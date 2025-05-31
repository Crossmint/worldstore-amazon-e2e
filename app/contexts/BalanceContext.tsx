'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAccount, useBalance } from 'wagmi';

interface BalanceContextType {
  balance: bigint | undefined;
  formattedBalance: string | undefined;
  refetchBalance: () => Promise<void>;
}

const BalanceContext = createContext<BalanceContextType>({
  balance: undefined,
  formattedBalance: undefined,
  refetchBalance: async () => {},
});

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { address: walletAddress } = useAccount();
  const { data: balanceData, refetch } = useBalance({
    address: walletAddress,
    chainId: 11155111, // Sepolia
    token: '0xe9fFA6956BFfC367B26dD3c256CF0C978603Eaec', // CREDIT token address on Sepolia
  });

  const refetchBalance = async () => {
    await refetch();
  };

  return (
    <BalanceContext.Provider
      value={{
        balance: balanceData?.value,
        formattedBalance: balanceData?.formatted,
        refetchBalance,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalanceContext() {
  return useContext(BalanceContext);
} 