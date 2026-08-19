'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('guest')
  const [password, setPassword] = useState('111111')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    setLoading(false)
    if (res?.error) {
      setError('账号或密码错误')
    } else {
      // 访客（guest）登录后只进入车位分布图页面
      if (username.trim() === 'guest') {
        router.push('/dashboard/distribution')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'linear-gradient(135deg,#1677ff22,#52c41a22)',
    }}>
      <div className="card" style={{ width: 380 }}>
        <div className="text-center mb-4">
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>🅿️ 车位管理系统</h1>
          <p className="text-sm text-gray mt-2">开发商内部管理平台</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-sm">账号</label>
            <input
              className="input mt-2"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入账号"
              autoComplete="off"
              required
            />
          </div>
          <div className="mb-4">
            <label className="text-sm">密码</label>
            <input
              className="input mt-2"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="new-password"
              required
            />
          </div>
          {error && <div className="text-red text-sm mb-2">{error}</div>}
          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: 15 }}
            disabled={loading}
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>
        <p className="text-xs text-gray text-center mt-4">
          访客账号已自动填入（guest / 111111），可直接登录查看车位分布图
        </p>
      </div>
    </div>
  )
}
