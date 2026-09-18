'use client'

import { useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'

// 30 分钟无操作自动登出（毫秒）
const IDLE_TIMEOUT = 30 * 60 * 1000
// 活动事件频繁触发，节流：每分钟最多重置一次定时器，避免性能开销
const RESET_THROTTLE = 60 * 1000

export default function AutoLogout() {
  const session = useSession()
  const status = session?.status
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastReset = useRef(0)

  useEffect(() => {
    // 仅登录态启用；未登录/加载中不起动计时器
    if (status !== 'authenticated') return

    const reset = () => {
      const now = Date.now()
      if (now - lastReset.current < RESET_THROTTLE) return
      lastReset.current = now
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        signOut({ callbackUrl: '/login' })
      }, IDLE_TIMEOUT)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset() // 初始化启动

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset))
      if (timer.current) clearTimeout(timer.current)
    }
  }, [status])

  return null
}
