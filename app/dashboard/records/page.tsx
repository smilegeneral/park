import { getSaleRecords } from '@/lib/queries'
import Link from 'next/link'

// ============================================================
//  销售记录 - 展示历史销售
// ============================================================

export default async function RecordsPage() {
  const records = await getSaleRecords(100)

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>📋 销售记录</h1>
          <p className="text-sm text-gray">最近 100 条销售记录</p>
        </div>
        <Link href="/dashboard" style={{ fontSize: 14 }}>← 返回</Link>
      </header>

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>销售单号</th>
                <th>车位号</th>
                <th>类型</th>
                <th>房屋</th>
                <th>业主</th>
                <th>电话</th>
                <th>金额</th>
                <th>时间</th>
                <th>状态</th>
                <th>团购</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr><td colSpan={10} className="text-center text-gray">暂无销售记录</td></tr>
              )}
              {records.map(r => (
                <tr key={r.record_id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.sale_order_no}</td>
                  <td style={{ fontWeight: 600 }}>{r.space_no}</td>
                  <td>{r.space_type}</td>
                  <td>{r.house_key}</td>
                  <td>{r.owner_name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{r.phone}</td>
                  <td style={{ color: '#fa8c16', fontWeight: 600 }}>
                    ¥{Number(r.amount).toLocaleString()}
                  </td>
                  <td style={{ fontSize: 12 }}>{r.sale_time?.slice(0, 10)}</td>
                  <td>
                    <span className={`badge ${r.status === '已确认' ? 'badge-blue' : 'badge-gray'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.is_group_buy === '是' ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
