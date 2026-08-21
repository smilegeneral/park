// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// 角色等级：0=访客 1=销售员 2=管理员 3=超级管理员
const ROLE_GUEST = 0
const ROLE_ADMIN = 2

// 仅管理员可访问的路由前缀
const ADMIN_ONLY_PREFIXES = [
  '/dashboard/users',
  '/dashboard/print',
  '/dashboard/reports',
  '/dashboard/owners',
]

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // 未登录：跳登录页并携带回调地址
    if (!token) {
      const url = new URL('/login', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    const role = token.role as number

    // 访客（role=0）仅可访问车位分布图
    if (role === ROLE_GUEST) {
      if (pathname === '/dashboard/distribution') return NextResponse.next()
      return NextResponse.redirect(new URL('/dashboard/distribution', req.url))
    }

    // 管理员专属路由：role < 2 拦截
    if (
      ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
    ) {
      if (role < ROLE_ADMIN) {
        const url = new URL('/dashboard', req.url)
        url.searchParams.set('error', 'admin_only')
        return NextResponse.redirect(url)
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*'],
}