import { getAllOwners, getOwnerChangeLogs } from '@/lib/queries'
import OwnerList from './owner-list'
import Link from 'next/link'

// ============================================================
//  业主信息变更 - 查看业主档案、修改联系方式
//  变更记录写入 owner_info_change_log 全留痕
// ============================================================

export default async function OwnersPage() {
  const owners = await getAllOwners()
  const logs = await getOwnerChangeLogs(50)

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>👤 业主信息变更</h1>
          <p className="text-sm text-gray">
            共 {owners.length} 位业主 · 变更操作将记录到变更日志
          </p>
        </div>
        <Link href="/dashboard" style={{ fontSize: 14 }}>← 返回</Link>
      </header>

      <OwnerList owners={owners} logs={logs} />
    </main>
  )
}
