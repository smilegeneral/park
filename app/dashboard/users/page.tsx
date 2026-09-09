import { getAdminUsers, getAiConfigs } from '@/lib/queries'
import UserManager from './user-manager'
import AiConfigManager from './ai-config-manager'
import Link from 'next/link'
import type { AiConfig } from '@/lib/types'

export default async function UsersPage() {
  const users = await getAdminUsers()

  // ai_config 表可能尚未创建（未执行 sql/init-ai-config.sql），
  // 容错处理：读不到就当空列表，避免整个用户管理页打不开。
  let aiConfigs: AiConfig[] = []
  try {
    aiConfigs = await getAiConfigs()
  } catch {
    aiConfigs = []
  }

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div className="flex" style={{ gap: 10, alignItems: 'center' }}>
          <Link href="/dashboard" className="btn-ghost" style={{ fontSize: 13 }}>← 返回</Link>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>👥 用户与角色管理</h1>
        </div>
      </header>

      <UserManager users={users} />
      <AiConfigManager configs={aiConfigs} />
    </main>
  )
}
