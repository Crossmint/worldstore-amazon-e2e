'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { WalletConnect } from './WalletConnect';
import { useAccount, useWalletClient, useSignMessage, useSendTransaction, useChainId } from 'wagmi';
import { parseTransaction } from 'viem';
import { useBalanceContext } from '../contexts/BalanceContext';
import { mainnet, sepolia, base, baseSepolia } from 'wagmi/chains';

interface AddToCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    title: string;
    variant?: string;
    price: number | string;
    thumbnail: string;
    asin: string;
  };
  onBalanceUpdate?: () => void;
}

type CheckoutPhase = 'details' | 'review' | 'signing' | 'processing' | 'success' | 'error';

interface Quote {
  status: string;
  quotedAt: string;
  expiresAt: string;
  totalPrice: {
    amount: string;
    currency: string;
  };
}

interface OrderData {
  orderId: string;
  payment: {
    preparation: {
      serializedTransaction: string;
      payerAddress: string;
      chain: string;
    };
  };
}

type Currency = 'credit' | 'usdc';

export default function AddToCartModal({ isOpen, onClose, product, onBalanceUpdate }: AddToCartModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address: walletAddress } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { signMessageAsync } = useSignMessage();
  const { sendTransaction } = useSendTransaction();
  const { balance, formattedBalance, refetchBalance } = useBalanceContext();
  const [email, setEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    address1: '',
    address2: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'US'
  });
  const [phase, setPhase] = useState<CheckoutPhase>('details');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [faucetStatus, setFaucetStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle');
  const [faucetMessage, setFaucetMessage] = useState<string>('');
  const [faucetTxHash, setFaucetTxHash] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 1;
  const [forceUpdate, setForceUpdate] = useState(0);
  const [refreshingQuote, setRefreshingQuote] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('credit');

  // Get chain name from chainId
  const getChainName = (id: number) => {
    switch (id) {
      case mainnet.id:
        return 'ethereum';
      case sepolia.id:
        return 'ethereum-sepolia';
      case base.id:
        return 'base';
      case baseSepolia.id:
        return 'base-sepolia';
      default:
        return 'ethereum-sepolia'; // Default to sepolia
    }
  };

  // Fetch balance when modal opens
  useEffect(() => {
    if (isOpen && walletAddress) {
      refetchBalance();
    }
  }, [isOpen, walletAddress, refetchBalance]);

  const resetModal = () => {
    setLoading(false);
    setError(null);
    setEmail('');
    setShippingAddress({
      name: '',
      address1: '',
      address2: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'US'
    });
    setPhase('details');
    setOrderId(null);
    setOrderStatus(null);
    setQuote(null);
    setOrderData(null);
    setFaucetStatus('idle');
    setFaucetMessage('');
    setFaucetTxHash('');
    setRetryCount(0);
    setForceUpdate(0);
    setRefreshingQuote(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Log balance changes
  useEffect(() => {
    console.log('Balance changed:', {
      balance: balance?.toString(),
      formattedBalance,
      quoteAmount: quote?.totalPrice.amount,
      forceUpdate
    });
  }, [balance, formattedBalance, quote, forceUpdate]);

  const requestFaucet = async () => {
    if (!walletAddress) return;

    setFaucetStatus('requesting');
    setFaucetMessage('Requesting credits...');

    try {
      const response = await fetch('/api/checkout/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        throw new Error('Failed to request credits');
      }

      const data = await response.json();

      if (data.error) {
        setFaucetStatus('error');
        if (data.message.includes('cooldown')) {
          setFaucetMessage('This wallet is in cooldown. Please try another wallet.');
        } else {
          setFaucetMessage(data.message || 'Failed to request credits');
        }
      } else {
        setFaucetTxHash(data.transactionHash);
        setFaucetMessage('Transaction sent! Waiting for confirmation...');
        setRetryCount(0); // Reset retry count on successful request
      }
    } catch (err) {
      console.error('Faucet request error:', err);
      setFaucetStatus('error');
      if (retryCount < MAX_RETRIES) {
        setFaucetMessage('Request failed. Click to retry...');
      } else {
        setFaucetMessage('Failed to request credits. Please try again later.');
      }
    }
  };

  // Poll faucet status
  useEffect(() => {
    if (faucetTxHash) {
      console.log('Starting faucet status polling for txHash:', faucetTxHash);
      const pollInterval = setInterval(async () => {
        try {
          console.log('Polling faucet status for txHash:', faucetTxHash);
          const response = await fetch(`/api/checkout/faucet/status?txHash=${faucetTxHash}`);
          const data = await response.json();
          console.log('Faucet status response:', data);
          
          if (data.error) {
            console.error('Faucet status error:', data.error);
            setFaucetStatus('error');
            setFaucetMessage(data.message || 'Failed to get credits');
            clearInterval(pollInterval);
            return;
          }

          switch (data.status) {
            case 'success':
              console.log('Faucet transaction successful');
              setFaucetStatus('success');
              setFaucetMessage('Credits received!');
              clearInterval(pollInterval);
              
              // Update balance
              await refetchBalance();
              
              // Only get new order if we're in review phase
              if (phase === 'review') {
                try {
                  console.log('Refreshing order after successful faucet transaction');
                  setRefreshingQuote(true);
                  const response = await fetch('/api/checkout/crossmint', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      ...product,
                      email,
                      shippingAddress,
                      walletAddress,
                      chain: getChainName(chainId)
                    }),
                  });

                  const data = await response.json();
                  console.log('New order response after faucet:', data);

                  if (!response.ok || !data.order?.payment?.preparation?.serializedTransaction) {
                    throw new Error('Failed to get new order');
                  }

                  // Store new order data
                  const newOrderId = data.order.orderId;
                  const newOrderData = {
                    orderId: data.order.orderId,
                    payment: data.order.payment
                  };
                  const newQuote = data.order.quote;

                  // Clear all order state first
                  setOrderId(null);
                  setOrderStatus(null);
                  setQuote(null);
                  setOrderData(null);
                  setPhase('review');
                  setLoading(false);
                  setError(null);

                  // Then set new order state in the next tick
                  setTimeout(() => {
                    setOrderId(newOrderId);
                    setOrderData(newOrderData);
                    setQuote(newQuote);
                    
                    console.log('New order state after faucet:', {
                      orderId: newOrderId,
                      hasQuote: !!newQuote,
                      hasTransaction: !!newOrderData.payment?.preparation?.serializedTransaction,
                      phase: 'review',
                      loading: false,
                      error: null
                    });
                  }, 0);

                } catch (err) {
                  console.error('Failed to refresh order:', err);
                  setError('Failed to refresh order. Please try again.');
                  setPhase('error');
                } finally {
                  setRefreshingQuote(false);
                }
              }
              break;
            case 'failed':
              console.log('Faucet transaction failed');
              setFaucetStatus('error');
              setFaucetMessage('Transaction failed');
              clearInterval(pollInterval);
              break;
            case 'pending':
              console.log('Faucet transaction still pending...');
              setFaucetMessage('Transaction pending...');
              break;
            default:
              console.warn('Unknown faucet status:', data.status);
              break;
          }
        } catch (error) {
          console.error('Error polling faucet status:', error);
          setFaucetStatus('error');
          setFaucetMessage('Failed to check transaction status');
          clearInterval(pollInterval);
        }
      }, 2000);

      return () => {
        console.log('Cleaning up faucet status polling');
        clearInterval(pollInterval);
      };
    }
  }, [faucetTxHash, onBalanceUpdate, refetchBalance]);

  // Poll order status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (orderId && phase === 'processing') {
      console.log('Starting order status polling for orderId:', orderId);
      pollInterval = setInterval(async () => {
        try {
          console.log('Polling order status for orderId:', orderId);
          const response = await fetch(`/api/checkout/crossmint/status?orderId=${orderId}`);
          const data = await response.json();
          console.log('Order status response:', data);

          if (data.phase === 'completed') {
            console.log('Order completed successfully');
            clearInterval(pollInterval);
            setPhase('success');
            await refetchBalance();
          } else if (data.phase === 'failed') {
            console.log('Order failed');
            clearInterval(pollInterval);
            setPhase('error');
            setError('Order failed to process');
          } else {
            console.log('Order still processing, current phase:', data.phase);
          }
        } catch (err) {
          console.error('Error polling order status:', err);
        }
      }, 1000);

      return () => {
        console.log('Cleaning up order status polling');
        clearInterval(pollInterval);
      };
    }
  }, [orderId, phase, refetchBalance]);

  if (!isOpen) return null;

  const handleReview = async () => {
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!chainId) {
      setError('Please select a network first');
      return;
    }

    if (!email) {
      setError('Please enter your email');
      return;
    }

    if (!shippingAddress.name || !shippingAddress.address1 || !shippingAddress.city || 
        !shippingAddress.province || !shippingAddress.postalCode) {
      setError('Please fill in all required shipping address fields');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const chainName = getChainName(chainId);
      console.log('Sending request to Crossmint with data:', {
        product,
        email,
        shippingAddress,
        walletAddress,
        chain: chainName,
        currency: selectedCurrency
      });

      // Get quote first
      const response = await fetch('/api/checkout/crossmint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...product,
          email,
          shippingAddress,
          walletAddress,
          chain: chainName,
          currency: selectedCurrency
        }),
      });

      const data = await response.json();
      console.log('Crossmint API Response:', data);

      if (!response.ok) {
        console.error('Crossmint API Error:', data);
        if (data.error?.includes('SELLER_CONFIG_INVALID')) {
          throw new Error('Please double check your shipping address and try again');
        }
        throw new Error(data.error || 'Failed to get quote');
      }

      // Log the structure of the response
      console.log('Response structure:', {
        hasOrder: !!data.order,
        orderKeys: data.order ? Object.keys(data.order) : [],
        hasQuote: data.order ? !!data.order.quote : false,
        quoteData: data.order?.quote,
        lineItems: data.order?.lineItems,
      });

      // The quote is in the order object
      if (!data.order?.quote) {
        console.error('No quote found in response:', data);
        throw new Error('No quote received from Crossmint');
      }

      // Store all the necessary data
      setQuote(data.order.quote);
      setOrderId(data.order.orderId);
      setOrderData({
        orderId: data.order.orderId,
        payment: data.order.payment
      });
      setPhase('review');
    } catch (err) {
      console.error('Quote error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get quote');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!walletClient || !orderData?.payment?.preparation?.serializedTransaction) {
      setError('Invalid order data. Please try again.');
      return;
    }

    if (quote && balance && Number(balance) < Number(quote.totalPrice.amount)) {
      setError(`Insufficient balance. You need ${quote.totalPrice.amount} credits.`);
      return;
    }

    setLoading(true);
    setError(null);
    setPhase('signing');

    try {
      const { serializedTransaction } = orderData.payment.preparation;
      const txHex = serializedTransaction.startsWith('0x') ? serializedTransaction : `0x${serializedTransaction}`;
      const tx = parseTransaction(txHex as `0x${string}`);

      const result = await sendTransaction({
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: BigInt(0),
        chainId: Number(tx.chainId)
      });

      console.log('Transaction sent:', result);
      setPhase('processing');
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process checkout');
      setPhase('error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Helper function to uppercase string values
  const uppercaseValue = (value: string) => value.toUpperCase();

  // Update the faucet button UI to handle retries
  const renderFaucetButton = () => {
    if (faucetStatus === 'idle' || (faucetStatus === 'error' && retryCount < MAX_RETRIES)) {
      return (
        <button
          onClick={() => {
            if (faucetStatus === 'error') {
              setRetryCount(prev => prev + 1);
            }
            requestFaucet();
          }}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
        >
          {faucetStatus === 'error' ? 'Retry Request' : 'Request Credits from Faucet'}
        </button>
      );
    }
    return null;
  };

  // Update the faucet status display in the review phase
  const renderFaucetStatus = () => {
    if (faucetStatus === 'requesting') {
      return (
        <div className="flex items-center justify-center space-x-2 text-blue-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{faucetMessage}</span>
        </div>
      );
    }
    if (faucetStatus === 'success') {
      return (
        <div className="text-green-600 text-center">
          {faucetMessage}
        </div>
      );
    }
    if (faucetStatus === 'error') {
      return (
        <div className="text-red-600 text-center">
          {faucetMessage}
        </div>
      );
    }
    return null;
  };

  // Update the faucet section in the review phase
  const renderFaucetSection = () => {
    // Only show faucet for ethereum-sepolia
    if (chainId !== sepolia.id) {
      return null;
    }

    if (walletAddress && selectedCurrency === 'credit' && (formattedBalance === undefined || (quote && balance !== undefined && Number(balance) < Number(quote.totalPrice.amount)))) {
      return (
        <div className="mt-2">
          {formattedBalance === undefined ? (
            <p className="text-gray-600 mb-2">Loading your credit balance...</p>
          ) : (
            <p className="text-red-600 mb-2">You need {quote?.totalPrice.amount} CREDITS to complete this purchase.</p>
          )}
          
          {renderFaucetButton()}
          {renderFaucetStatus()}
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    switch (phase) {
      case 'review':
        console.log('Review phase debug:', {
          walletAddress,
          balance,
          formattedBalance,
          quote,
          hasBalance: !!balance,
          hasFormattedBalance: !!formattedBalance,
          hasQuote: !!quote,
          quoteAmount: quote?.totalPrice.amount,
          balanceComparison: balance && quote ? Number(balance) < Number(quote.totalPrice.amount) : null,
          balanceValue: balance ? balance.toString() : null,
          quoteValue: quote?.totalPrice.amount,
          isDisabled: loading || (quote !== null && balance !== undefined && balance !== null && Number(balance) < Number(quote.totalPrice.amount)),
          buttonDisabledReason: loading ? 'loading' : 
            (quote !== null && balance !== undefined && balance !== null && Number(balance) < Number(quote.totalPrice.amount)) ? 
            'insufficient_balance' : 'enabled'
        });
        return (
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <img
                src={product.thumbnail}
                alt={product.title}
                className="w-24 h-24 object-contain rounded"
              />
              <div>
                <h3 className="font-medium text-gray-900">{product.title}</h3>
                {product.variant && (
                  <p className="text-sm text-gray-500">{product.variant}</p>
                )}
                <p className="text-lg font-medium text-gray-900 mt-1">
                  ${typeof product.price === 'string' ? product.price : product.price.toFixed(2)} (+ fees)
                </p>
              </div>
            </div>

            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900">Quote Details</h4>
              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-medium">
                    Total Price: {quote?.totalPrice.amount} {selectedCurrency.toUpperCase()}
                  </p>
                </div>
                <p>Quote Valid Until: {formatDate(quote?.expiresAt || '')}</p>
                <p className="text-xs text-gray-500">
                  This quote is valid for 10 minutes. After that, you'll need to request a new quote.
                </p>
                
                {/* Credit Balance Section */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {walletAddress && selectedCurrency === 'credit' && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Your Credit Balance:</span>
                      <span className="font-medium">
                        {formattedBalance ? `${formattedBalance} CREDITS` : 'Loading...'}
                      </span>
                    </div>
                  )}
                  {renderFaucetSection()}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Order Summary</h4>
              <div className="text-sm text-gray-600">
                <p>Email: {uppercaseValue(email)}</p>
                <p>Shipping Address:</p>
                <p>{uppercaseValue(shippingAddress.name)}</p>
                <p>{uppercaseValue(shippingAddress.address1)}</p>
                {shippingAddress.address2 && <p>{uppercaseValue(shippingAddress.address2)}</p>}
                <p>{uppercaseValue(shippingAddress.city)}, {uppercaseValue(shippingAddress.province)} {uppercaseValue(shippingAddress.postalCode)}</p>
                <p>{uppercaseValue(shippingAddress.country)}</p>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setPhase('details')}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
              <button
                onClick={handleFinalize}
                disabled={loading || refreshingQuote || (quote !== null && balance !== undefined && balance !== null && Number(balance) < Number(quote.totalPrice.amount))}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {loading ? 'Processing...' : 
                 refreshingQuote ? (
                   <span className="flex items-center justify-center">
                     <Loader2 className="h-4 w-4 animate-spin mr-2" />
                     Refreshing Quote...
                   </span>
                 ) : 'Finalize Order'}
              </button>
            </div>
          </div>
        );

      case 'signing':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Sign Transaction</h3>
            <p className="text-sm text-gray-600">Please sign the transaction in your wallet to complete the purchase.</p>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Processing Order</h3>
            <p className="text-sm text-gray-600">Your order is being processed. Please wait...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Order Successful!</h3>
            <p className="text-sm text-gray-600">Thank you for your purchase. You will receive a confirmation email shortly.</p>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium text-red-600">Order Failed</h3>
            <p className="text-sm text-gray-600">{error}</p>
            <div className="flex space-x-4">
              <button
                onClick={() => setPhase('review')}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Review
              </button>
              <button
                onClick={() => setPhase('details')}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Start Over
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <img
                src={product.thumbnail}
                alt={product.title}
                className="w-24 h-24 object-contain rounded"
              />
              <div>
                <h3 className="font-medium text-gray-900">{product.title}</h3>
                {product.variant && (
                  <p className="text-sm text-gray-500">{product.variant}</p>
                )}
                <p className="text-lg font-medium text-gray-900 mt-1">
                  ${typeof product.price === 'string' ? product.price : product.price.toFixed(2)} (+ fees)
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Connect Wallet</h4>
                <p className="text-sm text-gray-600 mb-4">Connect your wallet to proceed with checkout</p>
                <WalletConnect />
                {walletAddress && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium text-gray-900">Connected</span>
                      </div>
                      <span className="text-sm text-gray-500">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                    </div>
                  </div>
                )}
              </div>

              {walletAddress && (
                <>
                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-900 mb-2">
                      Payment Currency
                    </label>
                    <div className="relative">
                      <select
                        id="currency"
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
                        className="w-full appearance-none rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <option value="credit">CREDITS</option>
                        <option value="usdc">USDC</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Shipping Address</h4>
                    
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-900">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={shippingAddress.name}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="address1" className="block text-sm font-medium text-gray-900">
                        Address Line 1
                      </label>
                      <input
                        type="text"
                        id="address1"
                        value={shippingAddress.address1}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, address1: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="address2" className="block text-sm font-medium text-gray-900">
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        id="address2"
                        value={shippingAddress.address2}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, address2: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-900">
                          City
                        </label>
                        <input
                          type="text"
                          id="city"
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900"
                        />
                      </div>

                      <div>
                        <label htmlFor="province" className="block text-sm font-medium text-gray-900">
                          State/Province
                        </label>
                        <input
                          type="text"
                          id="province"
                          value={shippingAddress.province}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, province: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="postalCode" className="block text-sm font-medium text-gray-900">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        id="postalCode"
                        value={shippingAddress.postalCode}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handleReview}
              disabled={loading || !walletAddress}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Review Order'
              )}
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative my-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
        >
          <X className="h-6 w-6" />
        </button>

        {renderContent()}
      </div>
    </div>
  );
} 