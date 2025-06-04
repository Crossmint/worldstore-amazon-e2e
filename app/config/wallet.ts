export const WALLET_CONFIG = {
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
  appName: 'Crossmint Checkout',
  appDescription: 'Shop Amazon products with cryptocurrency',
  appUrl: 'https://checkout.crossmint.com',
  appIcon: 'https://checkout.crossmint.com/icon.png'
};

export const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY || ''; 