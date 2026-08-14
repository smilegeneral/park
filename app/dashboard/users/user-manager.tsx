'use client'
import { useState, useTransition } from 'react'
import {
  createUser, updateUserRole, resetUserPassword,
} from '@/lib/actions'
import { ALL_PERMISSIONS, ROLE_LABELS } from '@/lib/types'

// ============================================================
//  用户与角色管理
//  - 新增用户（账号/密码/显示名/角色/权限）
//  - 修改角色与权限、重置密码
// ============================================================

const ROLES = [1, 2, 3]

export default function UserManager({ users }: { users: any[] }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  return (
    <div>
      <div className="mb-4">
        <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => { setEditing(null); setShowForm(true) }}>
          ➕ 新增用户
        </button>
      </div>

      {showForm && (
        <UserForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onMsg={setMsg}
        />
      )}

      {msg && (
        <div className={msg.type === 'ok' ? 'text-green' : 'text-red'} style={{ marginBottom: 12, fontSize: 14, fontWeight: 500 }}>
          {msg.text}
        </div>
      )}

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>账号</th><th>显示名</th><th>角色</th><th>权限</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontFamily: 'monospace' }}>{u.username}</td>
                  <td>{u.display_name || '-'}</td>
                  <td>
                    <span className={`badge ${u.role === 3 ? 'badge-red' : u.role === 2 ? 'badge-blue' : 'badge-gray'}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="text-sm text-gray">
                    {u.role >= 2 ? '全部权限' : (u.permissions?.length ? u.permissions.map((p: string) => ALL_PERMISSIONS.find(x => x.code === p)?.label || p).join('、') : '无')}
                  </td>
                  <td>
                    <button className="btn-warning" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => { setEditing(u); setShowForm(true) }}>
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function UserForm({ initial, onClose, onMsg }: { initial: any | null; onClose: () => void; onMsg: (m: any) => void }) {
  const isEdit = !!initial
  const [username, setUsername] = useState(initial?.username || '')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState(initial?.display_name || '')
  const [role, setRole] = useState(initial?.role || 1)
  const [perms, setPerms] = useState<string[]>(initial?.permissions || [])
  const [pending, startTransition] = useTransition()

  function togglePerm(code: string) {
    setPerms(p => p.includes(code) ? p.filter(x => x !== code) : [...p, code])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onMsg(null)
    if (!isEdit && !username) return onMsg({ type: 'err', text: '请输入账号' })
    if (!isEdit && !password) return onMsg({ type: 'err', text: '请输入初始密码' })

    startTransition(async () => {
      try {
        if (!isEdit) {
          await createUser({ username, password, display_name: displayName, role, permissions: perms })
          onMsg({ type: 'ok', text: `✅ 用户 ${username} 创建成功` })
        } else {
          await updateUserRole({ id: initial.id, role, permissions: perms, display_name: displayName })
          onMsg({ type: 'ok', text: `✅ 用户 ${username} 信息已更新` })
        }
        onClose()
      } catch (e: any) {
        onMsg({ type: 'err', text: `❌ ${e.message}` })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-4" style={{ background: '#fafcff' }}>
      <div className="text-sm" style={{ fontWeight: 600, marginBottom: 10 }}>{isEdit ? '编辑用户' : '新增用户'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Labeled label="账号">
          <input className="input" value={username} disabled={isEdit} onChange={e => setUsername(e.target.value)} />
        </Labeled>
        <Labeled label={isEdit ? '新密码（留空不修改）' : '初始密码 *'}>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isEdit ? '不修改请留空' : ''} />
        </Labeled>
        <Labeled label="显示名">
          <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </Labeled>
        <Labeled label="角色">
          <select className="select" value={role} onChange={e => setRole(Number(e.target.value))}>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </Labeled>
      </div>

      <div className="mt-4">
        <div className="text-sm" style={{ fontWeight: 600, marginBottom: 6 }}>
          功能权限 {role >= 2 && <span className="text-xs text-gray">（管理员/超级管理员默认拥有全部权限，以下仅对销售员生效）</span>}
        </div>
        <div className="flex" style={{ gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
          {ALL_PERMISSIONS.map(p => (
            <label key={p.code} className="flex" style={{ gap: 4, alignItems: 'center' }}>
              <input type="checkbox" checked={perms.includes(p.code)} disabled={role >= 2}
                onChange={() => togglePerm(p.code)} />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex mt-4" style={{ gap: 8 }}>
        <button type="submit" className="btn-success" disabled={pending} style={{ fontSize: 13 }}>
          {pending ? '处理中...' : isEdit ? '保存' : '创建用户'}
        </button>
        <button type="button" className="btn-ghost" style={{ fontSize: 13 }} onClick={onClose}>取消</button>
      </div>
    </form>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 12, color: '#555', display: 'block' }}>
      {label}
      <div style={{ marginTop: 2 }}>{children}</div>
    </label>
  )
}
