'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Star, ShoppingBag, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AddToCartModal from '@/app/components/AddToCartModal';
import { Header } from '@/app/components/Header';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [allImages, setAllImages] = useState<string[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState<{ [key: string]: string[] }>({});

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        console.log('Fetching product for ASIN:', params.asin);
        const response = await fetch('/api/checkout/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            engine: "amazon_product",
            amazon_domain: "amazon.com",
            asin: params.asin
          }),
        });

        console.log('API Response status:', response.status);
        const responseText = await response.text();
        console.log('API Response text:', responseText);

        let data;
        try {
          data = JSON.parse(responseText);
          console.log('Parsed API Response:', data);
        } catch (e) {
          console.error('Failed to parse API response:', e);
          throw new Error('Invalid API response format');
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch product');
        }

        if (!data.product) {
          console.warn('No product data in response:', data);
          throw new Error('Product not found');
        }

        // Check if product is Amazon Fresh or Whole Foods
        if (data.product.is_amazon_fresh === true || data.product.buybox?.is_amazon_fresh === true) {
          throw new Error('Amazon Fresh products are not supported');
        }
        if (data.product.is_whole_foods_market === true || data.product.buybox?.is_whole_foods_market === true) {
          throw new Error('Whole Foods Market products are not supported');
        }
        const unit = data.product.price_per?.unit?.toLowerCase();
        if (unit && ['ounce', 'lb', 'gram'].includes(unit)) {
          throw new Error('Products with per-unit pricing are not supported');
        }

        console.log('Product data:', JSON.stringify(data.product, null, 2));

        // Extract price from various possible locations
        const price = data.product.price || 
                     data.product.extracted_price || 
                     data.product.buybox?.price?.value || 
                     data.product.buybox?.price?.raw;

        if (!price || price === 'Price not available' || price === 'N/A') {
          throw new Error('Price not available for this product');
        }

        setProduct(data.product);
        
        // Set up images array
        const mainImage = data.product.main_image;
        const additionalImages = (data.product.images || [])
          .map((img: any) => img.link || img.url)
          .filter((url: string) => url !== mainImage); // Filter out the main image if it exists in additional images
        
        const images = [mainImage, ...additionalImages].filter(Boolean);
        
        console.log('Product images:', images);
        setAllImages(images);
        setSelectedImage(images[0] || '/placeholder.png');

        // Handle variants
        if (data.product.variants && Array.isArray(data.product.variants)) {
          console.log('Product variants:', JSON.stringify(data.product.variants, null, 2));
          
          // Process dimensions from variants
          const dimensionMap: { [key: string]: Set<string> } = {};
          data.product.variants.forEach((variant: any) => {
            if (variant.dimensions) {
              variant.dimensions.forEach((dim: any) => {
                if (!dimensionMap[dim.name]) {
                  dimensionMap[dim.name] = new Set();
                }
                dimensionMap[dim.name].add(dim.value);
              });
            }
          });

          // Convert Sets to Arrays and sort
          const processedDimensions = Object.entries(dimensionMap).reduce((acc, [key, values]) => {
            acc[key] = Array.from(values).sort();
            return acc;
          }, {} as { [key: string]: string[] });

          setDimensions(processedDimensions);

          const processedVariants = data.product.variants.map((variant: any) => ({
            ...variant,
            selected: false,
            displayPrice: variant.buybox?.price?.value || variant.price?.value || variant.price,
            formattedPrice: (() => {
              const price = variant.buybox?.price?.value || variant.price?.value || variant.price;
              return typeof price === 'string' ? price : `$${price.toFixed(2)}`;
            })(),
            displayTitle: variant.title || variant.name || 'Option'
          }));
          console.log('Processed variants:', JSON.stringify(processedVariants, null, 2));
          setVariants(processedVariants);
          
          // Find the variant that matches the current ASIN
          const currentVariant = processedVariants.find((v: { asin: string }) => v.asin === params.asin);
          if (currentVariant) {
            setSelectedVariant(currentVariant);
          } else if (processedVariants.length > 0) {
            setSelectedVariant(processedVariants[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    if (params.asin) {
      fetchProduct();
    }
  }, [params.asin]);

  const handleVariantClick = (variant: any) => {
    setSelectedVariant(variant);
    if (variant.asin && variant.asin !== params.asin) {
      router.push(`/product/${variant.asin}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Product not found</h3>
          <p className="mt-1 text-sm text-gray-500">The product you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-8">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to search
        </Link>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Product Images */}
            <div className="space-y-4">
              <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={selectedImage}
                  alt={product.title}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              {allImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {allImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(image)}
                      className={`relative h-24 rounded-lg overflow-hidden border-2 ${
                        selectedImage === image ? 'border-blue-500' : 'border-transparent'
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`Product image ${index + 1}`}
                        fill
                        className="object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>
                {product.rating && (
                  <div className="flex items-center mt-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-gray-600">
                      {product.rating} ({product.reviews || 0} reviews)
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-3xl font-bold text-blue-600 mb-4">
                  {selectedVariant?.displayPrice || product.buybox?.price?.value || product.price?.value || product.extracted_price ? (
                    `$${selectedVariant?.displayPrice || product.buybox?.price?.value || product.price?.value || product.extracted_price}`
                  ) : (
                    'Price not available'
                  )}
                </h2>
                {(selectedVariant?.original_price || product.original_price) && (
                  <p className="text-lg text-gray-500 line-through">
                    {typeof (selectedVariant?.original_price || product.original_price) === 'string' 
                      ? (selectedVariant?.original_price || product.original_price) 
                      : `$${selectedVariant?.original_price || product.original_price}`}
                  </p>
                )}

                {/* Add availability status */}
                {product.availability && (
                  <p className={`text-sm font-medium mt-2 ${
                    product.availability.toLowerCase().includes('in stock') 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {product.availability}
                  </p>
                )}

                {variants.length > 0 && (
                  <div className="mt-4">
                    <label htmlFor="variant-select" className="block text-sm font-medium text-gray-900 mb-2">
                      Select a variant
                    </label>
                    <div className="relative">
                      <select
                        id="variant-select"
                        value={selectedVariant?.asin || ''}
                        onChange={(e) => {
                          const variant = variants.find(v => v.asin === e.target.value);
                          if (variant) {
                            handleVariantClick(variant);
                          }
                        }}
                        className="w-full appearance-none rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {variants
                          .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
                          .map((variant) => (
                            <option key={variant.asin} value={variant.asin}>
                              {variant.title}
                            </option>
                          ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 mt-4"
                >
                  Buy Now
                </button>
              </div>

              {product.description && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
                  <div className="prose prose-sm text-gray-500">
                    <p>{product.description}</p>
                  </div>
                </div>
              )}

              {product.features && product.features.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Features</h3>
                  <ul className="space-y-2">
                    {product.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {product.specifications && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Product Details</h3>
                  <dl className="grid grid-cols-1 gap-y-4">
                    {Array.isArray(product.specifications) ? (
                      product.specifications.map((spec: any, index: number) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:items-center">
                          <dt className="text-sm font-medium text-gray-500 sm:w-1/3">
                            {spec.name}
                          </dt>
                          <dd className="text-sm text-gray-900 sm:w-2/3 mt-1 sm:mt-0">
                            {spec.value}
                          </dd>
                        </div>
                      ))
                    ) : (
                      Object.entries(product.specifications).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex flex-col sm:flex-row sm:items-center">
                          <dt className="text-sm font-medium text-gray-500 sm:w-1/3">
                            {key}
                          </dt>
                          <dd className="text-sm text-gray-900 sm:w-2/3 mt-1 sm:mt-0">
                            {typeof value === 'object' ? value.value || JSON.stringify(value) : String(value)}
                          </dd>
                        </div>
                      ))
                    )}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AddToCartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={{
          title: product.title,
          variant: selectedVariant?.title,
          price: selectedVariant?.displayPrice || product.buybox?.price?.value || product.price?.value || product.extracted_price,
          thumbnail: selectedVariant?.thumbnail || product.thumbnail || product.main_image,
          asin: selectedVariant?.asin || product.asin,
        }}
      />
    </div>
  );
} 