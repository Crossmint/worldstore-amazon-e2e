type Environment = 'production' | 'staging';

const ENVIRONMENT = process.env.NEXT_PUBLIC_CROSSMINT_ENV;

if (!ENVIRONMENT || (ENVIRONMENT !== 'production' && ENVIRONMENT !== 'staging')) {
  throw new Error(
    'Invalid NEXT_PUBLIC_CROSSMINT_ENV. Must be either "production" or "staging"'
  );
}

export const CROSSMINT_CONFIG = {
  baseUrl: ENVIRONMENT === 'production' 
    ? 'https://www.crossmint.com'
    : 'https://staging.crossmint.com',
  environment: ENVIRONMENT as Environment,
}; 