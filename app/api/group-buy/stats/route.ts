import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGroupBuyStatsDetail } from '@/lib/queries'

// 团购统计明细接口（供客户端组件调用）
//   GET /api/group-buy/stats?mode=department           -> 全部购买明细
//   GET /api/group-buy/stats?mode=company&key=公司名    -> 某公司购买明细
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // 鉴权：团购统计数据要求已登录
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role < 1) {
    return NextResponse.json({ ok: false, error: '未授权' }, { status: 401 })
  }
  try {
    const mode = (req.nextUrl.searchParams.get('mode') || 'department') as
      | 'department'
      | 'company'
    const key = req.nextUrl.searchParams.get('key')?.trim() || undefined
    const rows = await getGroupBuyStatsDetail(mode, key)
    return NextResponse.json({ ok: true, rows })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '查询失败' }, { status: 500 })
  }
}
