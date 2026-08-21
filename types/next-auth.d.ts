// ============================================================
//  next-auth v4 类型扩展：为 Session.user 增加 role 字段
//  （authorize 返回的 role 通过 callbacks.jwt / session 注入）
// ============================================================
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string
      username?: string
      role?: number
      display_name?: string
      permissions?: string[]
    } & DefaultSession['user']
  }

  interface User {
    id?: string
    username?: string
    role?: number
    display_name?: string
    permissions?: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    username?: string
    role?: number
    display_name?: string
    permissions?: string[]
  }
}
