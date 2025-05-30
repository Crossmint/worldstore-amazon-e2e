export const WALLET_CONFIG = {
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
  appName: 'WorldStore',
  appDescription: 'WorldStore - Your Web3 Marketplace',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  appIcon: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/logo.png`,
};

export const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY || ''; 