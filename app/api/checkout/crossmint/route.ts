import { NextResponse } from 'next/server';
import https from 'https';
import { CROSSMINT_CONFIG } from '@/app/config/crossmint';

// Helper function to uppercase string values in an object
const uppercaseObjectValues = (obj: Record<string, any>): Record<string, any> => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key] = value.toUpperCase();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      acc[key] = uppercaseObjectValues(value);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Crossmint API - Request body:', JSON.stringify(body, null, 2));

    const { title, price, thumbnail, asin, email, shippingAddress, walletAddress, chain } = body;

    if (!title || !price || !asin || !email || !shippingAddress || !walletAddress || !chain) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Uppercase email and shipping address
    const uppercasedEmail = email.toUpperCase();
    const uppercasedShippingAddress = uppercaseObjectValues(shippingAddress);

    const API_KEY = process.env.CROSSMINT_API_KEY;
    if (!API_KEY) {
      console.error('Crossmint API - API key not configured');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Create a custom agent that ignores SSL certificate validation in development
    const agent = new https.Agent({
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    });

    // First, search for the product in Crossmint
    const searchResponse = await fetch(`${CROSSMINT_CONFIG.baseUrl}/api/v1-alpha1/ws/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchParameters: {
          "standard.marketplace.amazon.asin": asin
        },
        categories: ["*"],
        keywords: [""]
      }),
      // @ts-ignore - agent is valid but TypeScript doesn't recognize it
      agent
    });

    console.log('Crossmint Search API - Response status:', searchResponse.status);
    const searchData = await searchResponse.json();
    console.log('Crossmint Search API - Response:', JSON.stringify(searchData, null, 2));

    if (!searchResponse.ok) {
      return NextResponse.json(
        { error: searchData.message || 'Failed to search product' },
        { status: searchResponse.status }
      );
    }

    // Check if we found any products
    if (!searchData || !Array.isArray(searchData) || searchData.length === 0) {
      return NextResponse.json(
        { error: 'Item is not available for sale' },
        { status: 404 }
      );
    }

    const listing = searchData[0].listing;
    console.log('Found listing:', JSON.stringify(listing, null, 2));

    // Create crossmint checkout order
    const orderResponse = await fetch(`${CROSSMINT_CONFIG.baseUrl}/api/v1-alpha1/ws/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sellerId: searchData[0].sellerId,
        items: [
          {
            listingId: listing.id,
            listingParameters: {}
          }
        ],
        orderParameters: {
          shippingAddress: {
            name: uppercasedShippingAddress.name,
            address1: uppercasedShippingAddress.address1,
            address2: uppercasedShippingAddress.address2 || "",
            city: uppercasedShippingAddress.city,
            province: uppercasedShippingAddress.province,
            postalCode: uppercasedShippingAddress.postalCode,
            country: uppercasedShippingAddress.country
          }
        }
      }),
      // @ts-ignore - agent is valid but TypeScript doesn't recognize it
      agent
    });

    console.log('Checkout Order API - Response status:', orderResponse.status);
    const orderData = await orderResponse.json();
    console.log('Checkout Order API - Response:', JSON.stringify(orderData, null, 2));

    if (!orderResponse.ok) {
      return NextResponse.json(
        { error: orderData.message || 'Failed to create order' },
        { status: orderResponse.status }
      );
    }

    // Send to Crossmint headless checkout
    const checkoutResponse = await fetch(`${CROSSMINT_CONFIG.baseUrl}/api/2022-06-09/orders`, {
      method: 'POST',
      headers: {
        'X-API-KEY': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: {
          email: uppercasedEmail,
          physicalAddress: {
            name: uppercasedShippingAddress.name,
            line1: uppercasedShippingAddress.address1,
            line2: uppercasedShippingAddress.address2 || "",
            city: uppercasedShippingAddress.city,
            postalCode: uppercasedShippingAddress.postalCode,
            country: uppercasedShippingAddress.country,
            state: uppercasedShippingAddress.province
          }
        },
        locale: "en-US",
        payment: {
          receiptEmail: uppercasedEmail,
          method: chain,
          currency: "credit",
          payerAddress: walletAddress
        },
        externalOrder: orderData
      }),
      // @ts-ignore - agent is valid but TypeScript doesn't recognize it
      agent
    });

    console.log('Crossmint Checkout Order API - Response status:', checkoutResponse.status);
    const checkoutData = await checkoutResponse.json();
    console.log('Crossmint Checkout Order API - Response:', JSON.stringify(checkoutData, null, 2));

    if (!checkoutResponse.ok) {
      return NextResponse.json(
        { error: checkoutData.message || 'Failed to create checkout session' },
        { status: checkoutResponse.status }
      );
    }

    return NextResponse.json(checkoutData);
  } catch (error) {
    console.error('Crossmint API - Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 