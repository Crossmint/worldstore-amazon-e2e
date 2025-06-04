'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { WalletConnect } from './WalletConnect';
import { useAccount } from 'wagmi';
import { useBalanceContext } from '../contexts/BalanceContext';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { address: walletAddress } = useAccount();
  const { formattedBalance } = useBalanceContext();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-indigo-600">Crossmint Checkout</h1>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {walletAddress && formattedBalance && (
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <span className="text-sm text-gray-600">Credits:</span>
                <span className="text-sm font-semibold text-gray-900">{formattedBalance}</span>
              </div>
            )}
            <WalletConnect />
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
          <div className="pt-2 pb-3 space-y-1">
            {walletAddress && formattedBalance && (
              <div className="px-4 py-2">
                <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-600">Credits:</span>
                  <span className="text-sm font-semibold text-gray-900">{formattedBalance}</span>
                </div>
              </div>
            )}
            <div className="px-2 py-3">
              <WalletConnect />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 