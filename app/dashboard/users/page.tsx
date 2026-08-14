import { getAdminUsers } from '@/lib/queries'
import UserManager from './user-manager'
import Link from 'next/link'

export default async function UsersPage() {
  const users = await getAdminUsers()
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div className="flex" style={{ gap: 10, alignItems: 'center' }}>
          <Link href="/dashboard" className="btn-ghost" style={{ fontSize: 13 }}>← 返回</Link>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>👥 用户与角色管理</h1>
        </div>
      </header>
      <UserManager users={users} />
    </main>
  )
}
