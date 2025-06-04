import { NextResponse } from 'next/server';
import { CROSSMINT_CONFIG } from '@/app/config/crossmint';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.json(
      { error: 'Order ID is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${CROSSMINT_CONFIG.baseUrl}/api/2022-06-09/orders/${orderId}`,
      {
        headers: {
          'X-API-KEY': process.env.CROSSMINT_API_KEY || '',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch order status');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching order status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order status' },
      { status: 500 }
    );
  }
} 