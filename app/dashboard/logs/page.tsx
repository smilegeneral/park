import { getChangeLogs } from '@/lib/queries'
import Link from 'next/link'
import ChangeLogTable from './change-log-table'

// ============================================================
//  变更日志 - 车位调换/核销全留痕
// ============================================================

// 该页需在请求时查库，禁止构建期静态预渲染（避免构建时连库失败）
export const dynamic = 'force-dynamic'

export default async function LogsPage() {
  const logs = await getChangeLogs(500)

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>📜 变更日志</h1>
          <p className="text-sm text-gray">车位调换/核销操作全记录</p>
        </div>
        <Link href="/dashboard" style={{ fontSize: 14 }}>← 返回</Link>
      </header>

      <ChangeLogTable logs={logs} />
    </main>
  )
}
