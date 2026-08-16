/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  // 确保 pg 及其 node 原生依赖（net/tls）只在服务端打包，绝不进入客户端 bundle
  serverExternalPackages: ['pg', 'pg-native'],
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
