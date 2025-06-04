import { mainnet, sepolia, base, baseSepolia } from 'wagmi/chains';
import { CROSSMINT_CONFIG } from './crossmint';

// Ensure we have at least one chain
if (!CROSSMINT_CONFIG.environment) {
  throw new Error('NEXT_PUBLIC_CROSSMINT_ENV must be set');
}

export const SUPPORTED_CHAINS = CROSSMINT_CONFIG.environment === 'production'
  ? [mainnet, base] as const
  : [sepolia, baseSepolia] as const;

export const DEFAULT_CHAIN = CROSSMINT_CONFIG.environment === 'production'
  ? mainnet
  : sepolia; 