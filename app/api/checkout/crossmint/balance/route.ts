import { NextResponse } from 'next/server';
import { CROSSMINT_CONFIG } from '@/app/config/crossmint';
import { CROSSMINT_API_KEY } from '@/app/config/wallet';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${CROSSMINT_CONFIG.baseUrl}/api/v1-alpha2/wallets/${walletAddress}/balances?tokens=credit,usdc`,
      {
        headers: {
          'X-API-KEY': CROSSMINT_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch balances');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching balances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balances' },
      { status: 500 }
    );
  }
} 