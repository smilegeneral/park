import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

// 与 types/next-auth.d.ts 中 Session.user.role?: number 保持一致
type Role = number

export type SessionUser = {
  id: number
  username: string
  role: Role
  name: string
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
    name: session.user.name,
  }
}

/**
 * 校验当前登录用户，并强制其角色达到要求的最低等级。
 * role 数值越大权限越高：0=访客 1=销售员 2=管理员。
 * 返回 sessionUser；若未登录或权限不足，返回 null（调用方应返回 401/403）。
 */
export async function requireRole(minRole: Role): Promise<SessionUser | null> {
  const u = await getSessionUser()
  if (!u) return null
  if (u.role < minRole) return null
  return u
}
