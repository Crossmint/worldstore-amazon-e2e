import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Search API - Request body:', body);

    const { engine, amazon_domain, asin, q } = body;

    if (!engine || !amazon_domain) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const API_KEY = process.env.SEARCH_API_KEY;
    if (!API_KEY) {
      console.error('Search API - API key not configured');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Build the base URL
    let endpoint;
    if (asin) {
      endpoint = `https://www.searchapi.io/api/v1/search?engine=amazon_product&amazon_domain=${amazon_domain}&asin=${asin}`;
    } else if (q) {
      endpoint = `https://www.searchapi.io/api/v1/search?engine=amazon_search&amazon_domain=${amazon_domain}&q=${encodeURIComponent(q)}`;
    } else {
      return NextResponse.json(
        { error: 'Either asin or search query (q) is required' },
        { status: 400 }
      );
    }

    console.log('Search API - Making request to:', endpoint);

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Search API - Response status:', response.status);
    const responseText = await response.text();
    console.log('Search API - Response text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Search API - Parsed response:', data);
    } catch (e) {
      console.error('Search API - Failed to parse response:', e);
      return NextResponse.json(
        { error: 'Invalid API response format' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Search failed' },
        { status: response.status }
      );
    }

    // Handle different response formats
    if (asin) {
      // For ASIN search, we expect a product object
      if (!data.product && !data.organic_results?.[0]) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      // If we have organic_results, use the first result as the product
      if (!data.product && data.organic_results?.[0]) {
        data.product = data.organic_results[0];
      }
    } else {
      // For keyword search, we expect organic_results
      if (!data.organic_results) {
        return NextResponse.json(
          { error: 'No results found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API - Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 