/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'm.media-amazon.com',
      'images-na.ssl-images-amazon.com',
      'media-amazon.com',
      'www.crossmint.com',
      'staging.crossmint.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazon.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: '**.crossmint.com',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig 