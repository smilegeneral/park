import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import type { ParkingSpace } from '@/lib/types'

// 团购车位查询接口（供客户端组件调用，避免客户端直接引入 pg）
//   GET /api/group-buy/spaces            -> 未售车位列表
//   GET /api/group-buy/spaces?company=X  -> 某公司名下的团购锁定车位
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // 鉴权：团购车位数据要求已登录
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role < 1) {
    return NextResponse.json({ ok: false, error: '未授权' }, { status: 401 })
  }
  try {
    const company = req.nextUrl.searchParams.get('company')?.trim()
    let rows: ParkingSpace[]
    if (company) {
      const r = await pool.query(
        `SELECT * FROM parking_spaces WHERE group_company = $1 ORDER BY space_id`,
        [company]
      )
      rows = r.rows as ParkingSpace[]
    } else {
      const r = await pool.query(
        `SELECT * FROM parking_spaces WHERE status = '未售' ORDER BY space_id`
      )
      rows = r.rows as ParkingSpace[]
    }
    return NextResponse.json({ ok: true, spaces: rows })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '查询失败' }, { status: 500 })
  }
}
