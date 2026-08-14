/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' }
  },
  webpack: (config) => {
    // Windows 上避免 watchpack 扫描系统目录（G:\System Volume Information）报 EINVAL
    config.watchOptions = {
      ...(config.watchOptions || {}),
      ignored: ['**/node_modules/**', '**/.git/**', '**/System Volume Information/**'],
    }
    return config
  },
}
module.exports = nextConfig
