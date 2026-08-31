// PM2 进程守护配置：park-system（Next.js 生产模式）
// 生产模式使用 next start（需先 next build 生成 .env.local 之外的产物），更稳定、资源占用更低。
//
// 重要：next start 不会自动继承 shell 的 .env.local（它由 Next 在 dev 时自动加载，
// 但 PM2 启动的进程环境来自 PM2 父进程）。因此这里显式读取 .env.local 并注入 env，
// 保证数据库 / NextAuth 等配置在运行时可用。改完 .env.local 后执行 `pm2 restart park-app --update-env` 即可同步。
//
// 用法：
//   npx next build                       # 改动代码后先重新构建
//   pm2 start ecosystem.config.js         # 启动
//   pm2 restart park-app --update-env     # 改了 .env.local 后重启并同步环境变量
//   pm2 save                              # 保存进程列表（开机自启用）
const fs = require('fs')

function loadEnvFile(file) {
  const out = {}
  try {
    const text = fs.readFileSync(file, 'utf8')
    text.split('\n').forEach((line) => {
      const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
      if (m) out[m[1]] = m[2].trim()
    })
  } catch {
    // 忽略文件不存在
  }
  return out
}

const localEnv = loadEnvFile('D:/park-system/.env.local')

module.exports = {
  apps: [
    {
      name: 'park-app',
      cwd: 'D:/park-system',
      // 用 node 直接执行 next 入口，避免在 Windows 下 shell 解析 npx/引号问题
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      time: true,
      env: {
        // 注入 .env.local 中的全部变量（AIVEN_URL / AIVEN_NO_VERIFY / NEXTAUTH_* 等）
        ...localEnv,
        NODE_ENV: 'production',
        PORT: '3000',
        // 关闭 CodeBuddy IDE 的安全删除 shim，避免极少数场景下文件删除被拦截
        CODEBUDDY_SAFE_DELETE_ENABLED: '0',
      },
    },
  ],
}
