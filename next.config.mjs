/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['images.unsplash.com'],
  },
  env: {
    SKIP_REDIS_DURING_BUILD: 'true',
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://mongodb:27017/portfolio',
    REDIS_URI: process.env.REDIS_URI || 'redis://redis:6379',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'c9a0b0b0e0f0a0c0d0e0f0a0b0c0d0e0f0a0b0c0d0e0f0a0b0c0d0e0f0a0b0',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  },
}

export default nextConfig
