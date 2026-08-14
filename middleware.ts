// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const role = token?.role
    const { pathname } = req.nextUrl

    // 访客（role=0）仅可访问车位分布图
    if (role === 0 && pathname !== '/dashboard/distribution') {
      return NextResponse.redirect(new URL('/dashboard/distribution', req.url))
    }
    return NextResponse.next()
  },
  {
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*'],
}