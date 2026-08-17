import { NextResponse } from 'next/server'
import { getNextSwapOrderNo } from '@/lib/queries'

// GET /api/next-swap-order
// 返回下一个车位调换单号 (BG + 三位数字, 从 074 起累加)
export async function GET() {
  try {
    const swap_order_no = await getNextSwapOrderNo()
    return NextResponse.json({ ok: true, swap_order_no })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || '获取单号失败' },
      { status: 500 }
    )
  }
}
