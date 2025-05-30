/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'm.media-amazon.com',
      'images-na.ssl-images-amazon.com',
      'media-amazon.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazon.com',
        pathname: '/images/**',
      },
    ],
  },
}

module.exports = nextConfig 