import { CROSSMINT_CONFIG } from './crossmint';

export const WALLET_CONFIG = {
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
  appName: 'Crossmint Checkout',
  appDescription: 'Shop Amazon products with cryptocurrency',
  appUrl: CROSSMINT_CONFIG.baseUrl,
  appIcon: `${CROSSMINT_CONFIG.baseUrl}/icon.png`
};

export const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY || ''; 