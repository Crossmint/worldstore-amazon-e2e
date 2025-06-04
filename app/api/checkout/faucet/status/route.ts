import { NextResponse } from 'next/server';

const FAUCET_API_URL = 'https://checkout-credit-faucet-crossmint.vercel.app/api/faucet/status';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const txHash = searchParams.get('txHash');

  if (!txHash) {
    return NextResponse.json(
      { error: true, message: 'Transaction hash is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${FAUCET_API_URL}?txHash=${txHash}`);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error checking faucet status:', error);
    return NextResponse.json(
      { error: true, message: 'Failed to check transaction status' },
      { status: 500 }
    );
  }
} 