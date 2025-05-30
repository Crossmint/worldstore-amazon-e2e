'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const isAsinSearch = /^[A-Z0-9]{10}$/.test(searchQuery.toUpperCase());
      const requestBody = {
        engine: "amazon_product",
        amazon_domain: "amazon.com",
        ...(isAsinSearch ? { asin: searchQuery.toUpperCase() } : { q: searchQuery })
      };

      console.log('Search request body:', requestBody);

      const response = await fetch('/api/worldstore/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      console.log('Search response:', data);

      if (isAsinSearch) {
        // For ASIN search, we get a single product
        if (data.product) {
          setResults([data.product]);
        } else {
          setResults([]);
        }
      } else {
        // For keyword search, we get an array of products in organic_results
        setResults(data.organic_results || []);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search products');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (asin: string) => {
    router.push(`/product/${asin}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block">Shop the future with</span>
                  <span className="block text-indigo-600">Worldstore</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Discover and purchase products using cryptocurrency. Experience seamless shopping with instant crypto payments.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 sm:-mt-16 md:-mt-20 lg:-mt-24">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ASIN or keywords (e.g., B01CI57V2O or adidas shoes)"
                  className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all duration-200"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="ml-3 inline-flex items-center px-6 py-4 border border-transparent text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:bg-indigo-300"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Searching products...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
            {results.map((product, index) => {
              const productTitle = product.title || 'No title available';
              const productImageUrl = product.thumbnail || product.main_image || '/placeholder.png';
              const productPrice = product.price || product.extracted_price || 'Price not available';
              const productAsin = product.asin;
              const position = product.position || index;

              if (!productAsin) {
                console.warn('Product missing ASIN:', product);
                return null;
              }

              return (
                <Link 
                  href={`/product/${productAsin}`} 
                  key={`${productAsin}-${position}`}
                  className="block"
                >
                  <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    <div className="relative h-48 bg-gray-100">
                      <Image
                        src={productImageUrl}
                        alt={productTitle}
                        fill
                        className="object-contain p-4"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {productTitle}
                      </h3>
                      <p className="text-xl font-bold text-blue-600">
                        {typeof productPrice === 'string' ? productPrice : `$${productPrice}`}
                      </p>
                      {product.rating && (
                        <div className="flex items-center mt-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${
                                  i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-sm text-gray-600 ml-2">
                            {product.rating} ({product.reviews || 0} reviews)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : hasSearched ? (
          <div className="text-center py-12">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">Try searching with different keywords.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
} 