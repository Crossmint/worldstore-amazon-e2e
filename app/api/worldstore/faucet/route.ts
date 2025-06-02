import { NextResponse } from 'next/server';

const FAUCET_API_URL = 'https://worldstore-credit-faucet.vercel.app/api/faucet';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: true, message: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const response = await fetch(FAUCET_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error requesting faucet:', error);
    return NextResponse.json(
      { error: true, message: 'Failed to request credits' },
      { status: 500 }
    );
  }
} 