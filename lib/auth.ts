// lib/auth.ts
import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import pool from './db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: '账号', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        // 先查数据库有没有这个用户
        let rows: any[]
        try {
          const res = await pool.query(
            `SELECT id, username, password_hash, role
             FROM public.admin_user  -- 显式指定public schema，避免连错库
             WHERE username = $1`,
            [credentials.username]
          )
          rows = res.rows
        } catch (err) {
          // 把数据库错误暴露出来，避免被统一误判为“账号密码错误”
          console.error('[auth] DB query failed:', (err as Error)?.message, (err as any)?.code)
          throw new Error('数据库连接失败：' + ((err as Error)?.message || String(err)))
        }

        if (rows.length === 0) {
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          rows[0].password_hash
        )

        if (!isValid) return null

        return {
          id: rows[0].id.toString(),
          name: rows[0].username,
          role: rows[0].role,
          display_name: rows[0].display_name || undefined,
          permissions: rows[0].role >= 2
            ? undefined // role>=2 视为全权限，由前端判定
            : (rows[0].permissions || '{}').startsWith('[')
              ? JSON.parse(rows[0].permissions)
              : [],
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // 登录成功后把角色/权限/身份 写入 JWT
      if (user) {
        token.id = (user as { id?: string }).id
        token.username = (user as { username?: string }).username ?? (user as { name?: string }).name
        token.role = (user as { role?: number }).role
        token.display_name = (user as { display_name?: string }).display_name
        token.permissions = (user as { permissions?: string[] }).permissions
      }
      return token
    },
    async session({ session, token }) {
      // 从 JWT 把角色/权限/身份 读到 session.user
      if (session.user) {
        ;(session.user as { id?: string }).id = token.id
        ;(session.user as { username?: string }).username = token.username
        ;(session.user as { role?: number }).role = token.role as number | undefined
        ;(session.user as { display_name?: string }).display_name = token.display_name as string | undefined
        ;(session.user as { permissions?: string[] }).permissions = token.permissions as string[] | undefined
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// 供 Server Component 获取会话（替代 NextAuth v5 的 auth()）
export function auth() {
  return getServerSession(authOptions)
}

export default NextAuth(authOptions)
