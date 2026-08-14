import { auth } from '@/lib/auth'
import Link from 'next/link'
import ChangePasswordForm from './change-password-form'

export default async function ChangePasswordPage() {
  const session = await auth()
  const userId = Number((session?.user as any)?.id ?? 0)
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '24px' }}>
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div className="flex" style={{ gap: 10, alignItems: 'center' }}>
          <Link href="/dashboard" className="btn-ghost" style={{ fontSize: 13 }}>← 返回</Link>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>🔑 修改密码</h1>
        </div>
      </header>
      <ChangePasswordForm userId={userId} />
    </main>
  )
}
