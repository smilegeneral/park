import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOwnerByHouseKey } from '@/lib/queries'

// GET /api/owner?house_key=1-1-101
// 按房屋编号查询业主档案（用于核销/销售时自动带出）
export async function GET(req: NextRequest) {
  // 鉴权：业主档案属敏感数据，要求已登录（role >= 1）
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role < 1) {
    return NextResponse.json({ ok: false, error: '未授权' }, { status: 401 })
  }
  const houseKey = req.nextUrl.searchParams.get('house_key')?.trim()
  if (!houseKey) {
    return NextResponse.json({ ok: false, error: '缺少 house_key' }, { status: 400 })
  }
  const owner = await getOwnerByHouseKey(houseKey)
  if (!owner) {
    return NextResponse.json({ ok: true, found: false })
  }
  return NextResponse.json({
    ok: true,
    found: true,
    owner: {
      house_key: owner.house_key,
      owner_name: owner.owner_name,
      phone: owner.phone,
      phone2: owner.phone2,
    },
  })
}
