import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

// GET /api/check-sale-order?no=S074
// 校验车位销售单号是否已存在 (sale_order_no 为 UNIQUE)
export async function GET(req: NextRequest) {
  const no = req.nextUrl.searchParams.get('no')?.trim()
  if (!no) {
    return NextResponse.json({ ok: true, exists: false })
  }
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM parking_sales_records WHERE sale_order_no = $1 LIMIT 1`,
      [no]
    )
    return NextResponse.json({ ok: true, exists: rows.length > 0 })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || '校验失败' },
      { status: 500 }
    )
  }
}
