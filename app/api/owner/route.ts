import { NextRequest, NextResponse } from 'next/server'
import { getOwnerByHouseKey } from '@/lib/queries'

// GET /api/owner?house_key=1-1-101
// 按房屋编号查询业主档案（用于核销/销售时自动带出）
export async function GET(req: NextRequest) {
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
