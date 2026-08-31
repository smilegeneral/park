/** @type {import('next').NextConfig} */
const { loadEnvConfig } = require('@next/env')
// 关键：确保生产模式（next start）也会加载 .env.local，
// 否则运行时拿不到 AIVEN_URL / NEXTAUTH_SECRET，导致数据库连不上、登录失败。
loadEnvConfig(process.cwd())
const nextConfig = {
  images: { unoptimized: true },
  // 确保 pg 及其 node 原生依赖（net/tls）只在服务端打包，绝不进入客户端 bundle
  experimental: {
    serverComponentsExternalPackages: ['pg', 'pg-native'],
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
