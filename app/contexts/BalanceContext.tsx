'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';

interface Balance {
  token: string;
  decimals: number;
  balances: {
    [chain: string]: string;
    total: string;
  };
}

interface BalanceContextType {
  balances: Balance[];
  formattedBalances: Record<string, Record<string, string>>;
  refetchBalances: () => Promise<void>;
}

const BalanceContext = createContext<BalanceContextType>({
  balances: [],
  formattedBalances: {},
  refetchBalances: async () => {},
});

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { address: walletAddress } = useAccount();
  const chainId = useChainId();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [formattedBalances, setFormattedBalances] = useState<BalanceContextType['formattedBalances']>({});

  const formatBalance = (balance: string, decimals: number) => {
    const value = BigInt(balance);
    const divisor = BigInt(Math.pow(10, decimals));
    const whole = value / divisor;
    const fraction = value % divisor;
    return `${whole}.${fraction.toString().padStart(decimals, '0')}`;
  };

  const refetchBalances = async () => {
    if (!walletAddress) return;

    try {
      const response = await fetch(`/api/checkout/crossmint/balance?walletAddress=${walletAddress}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch balances');
      }

      setBalances(data);

      // Format balances
      const formatted: BalanceContextType['formattedBalances'] = {};
      data.forEach((balance: Balance) => {
        formatted[balance.token] = {
          total: formatBalance(balance.balances.total, balance.decimals)
        };
        Object.entries(balance.balances).forEach(([chain, value]) => {
          if (chain !== 'total') {
            formatted[balance.token][chain] = formatBalance(value, balance.decimals);
          }
        });
      });

      setFormattedBalances(formatted);
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  // Fetch balances when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      refetchBalances();
    }
  }, [walletAddress]);

  return (
    <BalanceContext.Provider
      value={{
        balances,
        formattedBalances,
        refetchBalances,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
}

export const useBalanceContext = () => useContext(BalanceContext); 