/** @type {import('next').NextConfig} */
const nextConfig = {
  // AI analysis can take minutes — allow long-running route handlers
  experimental: {
    serverComponentsExternalPackages: ['exifr', 'sharp'],
  },
}

module.exports = nextConfig
