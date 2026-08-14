'use client'
import { signOut } from 'next-auth/react'

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="btn-danger"
      style={{ fontSize: 13 }}
    >
      退出登录
    </button>
  )
}
