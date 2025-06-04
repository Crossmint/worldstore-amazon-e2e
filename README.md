# Crossmint Checkout

Crossmint Checkout is a modern e-commerce platform that allows users to search and purchase Amazon products using cryptocurrency. Built with Next.js, TailwindCSS, and Web3 technologies.

## Features

- Search Amazon products by ASIN or keywords
- View detailed product information
- Purchase products using cryptocurrency ($CREDIT on Ethereum Sepolia)
- Responsive and modern UI
- Web3 wallet integration

## Prerequisites

- Node.js 18.x or later
- Yarn package manager
- A SearchAPI.io account for Amazon product search
- A Crossmint account for crypto payments
- MetaMask or any Web3 wallet that supports Ethereum Sepolia network
- $CREDIT tokens on Ethereum Sepolia (Contract: 0xe9fFA6956BFfC367B26dD3c256CF0C978603Eaec)

## Getting Started

First, clone the repository:

```bash
git clone https://github.com/yourusername/crossmint-checkout.git
cd crossmint-checkout
```

2. Install dependencies:
```bash
yarn install
```

3. Create a `.env.local` file in the root directory with the following variables:
```env
# SearchAPI.io credentials
SEARCH_API_KEY=your_searchapi_key

# Crossmint credentials
CROSSMINT_API_KEY=your_crossmint_key

# Optional: Environment
NODE_ENV=development
```

### Getting API Keys

1. **SearchAPI.io Key**:
   - Sign up at [SearchAPI.io](https://www.searchapi.io/)
   - Navigate to your dashboard
   - Copy your API key from the dashboard
   - The free tier includes 100 searches per month

2. **Crossmint Key**:
   - Sign up at [Crossmint](https://www.crossmint.com/)
   - Go to your developer dashboard
   - Create a new project
   - Copy your API key
   - Note: You'll need to use the staging environment for testing

### Setting Up Your Wallet

1. **Install MetaMask**:
   - Download and install [MetaMask](https://metamask.io/)
   - Create a new wallet or import an existing one

2. **Add Ethereum Sepolia Network**:
   - Network Name: Sepolia Test Network
   - RPC URL: https://rpc.sepolia.org
   - Chain ID: 11155111
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.etherscan.io

3. **Get $CREDIT Tokens**:
   - Contract Address: 0xe9fFA6956BFfC367B26dD3c256CF0C978603Eaec
   - Add the token to MetaMask using the contract address
   - Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
   - Purchase $CREDIT tokens using the test ETH

## Development

Run the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

```bash
yarn build
```

## Deployment

### Vercel Deployment

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Add the environment variables in the Vercel project settings
4. Deploy!

The project is optimized for Vercel deployment and includes all necessary configurations.

## Project Structure

```
worldstore/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── product/          # Product page
│   └── page.tsx          # Main search page
├── public/               # Static files
├── styles/              # Global styles
└── types/               # TypeScript types
```

## API Routes

The following API routes are available:

- `/api/checkout/search` - Search Amazon products
- `/api/checkout/crossmint` - Handle crypto payments
- `/api/checkout/faucet` - Request test credits
- `/api/checkout/faucet/status` - Check faucet request status

## Technologies Used

- Next.js 14
- React 18
- TailwindCSS
- TypeScript
- Wagmi (Web3)
- Viem
- SearchAPI.io
- Crossmint
- Ethereum Sepolia Network
- $CREDIT Token (0xe9fFA6956BFfC367B26dD3c256CF0C978603Eaec)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@crossmint.com or open an issue in the GitHub repository. 