import { NextResponse } from 'next/server'
import { getNextSaleOrderNo } from '@/lib/queries'

// GET /api/next-sale-order
// 返回下一个车位销售单号 (S + 三位数字, 取库中 S 前缀最大序号 +1)
export async function GET() {
  try {
    const sale_order_no = await getNextSaleOrderNo()
    return NextResponse.json({ ok: true, sale_order_no })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || '获取单号失败' },
      { status: 500 }
    )
  }
}
