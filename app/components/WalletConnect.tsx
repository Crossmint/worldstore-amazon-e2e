'use client';

import { useAccount, useChainId, useSwitchChain, useConnect, useDisconnect } from 'wagmi';
import { sepolia } from 'wagmi/chains';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = async () => {
    if (connectors[0]) {
      try {
        // First try to connect
        await connect({ connector: connectors[0], chainId: sepolia.id });
        
        // Then ensure we're on the right chain
        if (chainId !== sepolia.id) {
          await switchChain({ chainId: sepolia.id });
        }
      } catch (error) {
        console.error('Connection error:', error);
      }
    }
  };

  const handleSwitchNetwork = async () => {
    if (switchChain) {
      try {
        await switchChain({ chainId: sepolia.id });
      } catch (error) {
        console.error('Failed to switch network:', error);
      }
    }
  };

  if (isConnected) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-600">
          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
        {chainId !== sepolia.id && (
          <button
            onClick={handleSwitchNetwork}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Switch to Sepolia
          </button>
        )}
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      Connect Wallet
    </button>
  );
} 