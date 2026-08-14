'use client'
import { useState, useTransition } from 'react'
import { changeMyPassword } from '@/lib/actions'

export default function ChangePasswordForm({ userId }: { userId: number }) {
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!oldPwd || !newPwd) return setMsg({ type: 'err', text: '请填写完整' })
    if (newPwd.length < 6) return setMsg({ type: 'err', text: '新密码至少 6 位' })
    if (newPwd !== confirm) return setMsg({ type: 'err', text: '两次输入的新密码不一致' })

    startTransition(async () => {
      try {
        await changeMyPassword({ userId, oldPassword: oldPwd, newPassword: newPwd })
        setMsg({ type: 'ok', text: '✅ 密码修改成功，下次登录生效' })
        setOldPwd(''); setNewPwd(''); setConfirm('')
      } catch (e: any) {
        setMsg({ type: 'err', text: `❌ ${e.message}` })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div style={{ display: 'grid', gap: 12 }}>
        <Labeled label="原密码">
          <input className="input" type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} />
        </Labeled>
        <Labeled label="新密码（至少 6 位）">
          <input className="input" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
        </Labeled>
        <Labeled label="确认新密码">
          <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </Labeled>
      </div>
      {msg && (
        <div className={msg.type === 'ok' ? 'text-green' : 'text-red'} style={{ marginTop: 12, fontSize: 14, fontWeight: 500 }}>
          {msg.text}
        </div>
      )}
      <button type="submit" className="btn-primary mt-4" disabled={pending} style={{ width: '100%' }}>
        {pending ? '处理中...' : '保存新密码'}
      </button>
    </form>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 13, color: '#555', display: 'block' }}>
      {label}
      <div style={{ marginTop: 4 }}>{children}</div>
    </label>
  )
}
