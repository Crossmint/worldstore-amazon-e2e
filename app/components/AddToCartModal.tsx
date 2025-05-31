import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { WalletConnect } from './WalletConnect';
import { useAccount, useWalletClient, useSignMessage, useSendTransaction } from 'wagmi';
import { parseTransaction } from 'viem';

interface AddToCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    title: string;
    variant?: string;
    price: string | number;
    thumbnail: string;
    asin: string;
  };
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

export default function AddToCartModal({ isOpen, onClose, product }: AddToCartModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address: walletAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { signMessageAsync } = useSignMessage();
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
  const { sendTransaction } = useSendTransaction();

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (orderId && phase === 'processing') {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/worldstore/crossmint/status?orderId=${orderId}`);
          const data = await response.json();

          if (data.phase === 'completed') {
            setPhase('success');
            clearInterval(pollInterval);
          } else if (data.phase === 'failed') {
            setPhase('error');
            setError('Order failed to process');
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error('Error polling order status:', err);
        }
      }, 1000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [orderId, phase]);

  if (!isOpen) return null;

  const handleReview = async () => {
    if (!walletAddress) {
      setError('Please connect your wallet first');
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
      console.log('Sending request to Crossmint with data:', {
        product,
        email,
        shippingAddress,
        walletAddress
      });

      // Get quote first
      const response = await fetch('/api/worldstore/crossmint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...product,
          email,
          shippingAddress,
          walletAddress
        }),
      });

      const data = await response.json();
      console.log('Crossmint API Response:', data);

      if (!response.ok) {
        console.error('Crossmint API Error:', data);
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
    if (!walletClient) {
      setError('Wallet not connected');
      return;
    }

    if (!orderData) {
      setError('No order data available');
      return;
    }

    setLoading(true);
    setError(null);
    setPhase('signing');

    try {
      const { serializedTransaction } = orderData.payment.preparation;
      
      console.log('Original transaction:', serializedTransaction);

      // Parse the transaction
      const tx = parseTransaction(serializedTransaction as `0x${string}`);
      console.log('Parsed transaction:', tx);

      // Send the transaction using wagmi
      const result = await sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value || BigInt(0),
        maxFeePerGas: tx.maxFeePerGas,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
        gas: tx.gas,
        nonce: tx.nonce,
        chainId: tx.chainId
      });

      console.log('Transaction sent:', result);
      setPhase('processing');
    } catch (err) {
      console.error('Checkout error details:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : typeof err
      });
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

  const renderContent = () => {
    switch (phase) {
      case 'review':
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
              </div>
            </div>

            {quote && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900">Quote Details</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-medium">
                      Total Price: ${quote.totalPrice.amount} credits
                    </p>
                  </div>
                  <p>Quote Valid Until: {formatDate(quote.expiresAt)}</p>
                  <p className="text-xs text-gray-500">
                    This quote is valid for 10 minutes. After that, you'll need to request a new quote.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Order Summary</h4>
              <div className="text-sm text-gray-600">
                <p>Email: {email}</p>
                <p>Shipping Address:</p>
                <p>{shippingAddress.name}</p>
                <p>{shippingAddress.address1}</p>
                {shippingAddress.address2 && <p>{shippingAddress.address2}</p>}
                <p>{shippingAddress.city}, {shippingAddress.province} {shippingAddress.postalCode}</p>
                <p>{shippingAddress.country}</p>
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
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {loading ? 'Processing...' : 'Finalize Order'}
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
              onClick={onClose}
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
              </div>

              {walletAddress && (
                <>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Shipping Address</h4>
                    
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={shippingAddress.name}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="address1" className="block text-sm font-medium text-gray-700">
                        Address Line 1
                      </label>
                      <input
                        type="text"
                        id="address1"
                        value={shippingAddress.address1}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, address1: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="address2" className="block text-sm font-medium text-gray-700">
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        id="address2"
                        value={shippingAddress.address2}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, address2: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                          City
                        </label>
                        <input
                          type="text"
                          id="city"
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="province" className="block text-sm font-medium text-gray-700">
                          State/Province
                        </label>
                        <input
                          type="text"
                          id="province"
                          value={shippingAddress.province}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, province: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        id="postalCode"
                        value={shippingAddress.postalCode}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
        >
          <X className="h-6 w-6" />
        </button>

        {renderContent()}
      </div>
    </div>
  );
} 