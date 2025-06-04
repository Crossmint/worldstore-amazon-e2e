import { NextResponse } from 'next/server';
import { CROSSMINT_CONFIG } from '@/app/config/crossmint';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const txHash = searchParams.get('txHash');

    if (!txHash) {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${CROSSMINT_CONFIG.baseUrl}/api/faucet/status?txHash=${txHash}`
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to check faucet status' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Faucet status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 