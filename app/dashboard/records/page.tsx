import { searchSaleRecords } from '@/lib/queries'
import Link from 'next/link'
import SaleRecordTable from './sale-record-table'

// ============================================================
//  销售记录 - 展示历史销售
// ============================================================

// 该页需在请求时查库，禁止构建期静态预渲染（避免构建时连库失败）
export const dynamic = 'force-dynamic'

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const q = (searchParams.q || '').trim()
  const records = await searchSaleRecords(q, 500)

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>📋 销售记录</h1>
          <p className="text-sm text-gray">车位销售全记录（支持车位号/房号/业主姓名/销售单号模糊查询）</p>
        </div>
        <Link href="/dashboard" style={{ fontSize: 14 }}>← 返回</Link>
      </header>

      <SaleRecordTable records={records} initialQ={q} />
    </main>
  )
}
