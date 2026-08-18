import { searchSpaces } from '@/lib/queries'
import Link from 'next/link'
import QueryForm from './query-form'
import QueryActions from './query-actions'

export default async function QueryPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  const params = {
    space_id: searchParams.space_id || '',
    garage_zone: searchParams.garage_zone || '',
    building_no: searchParams.building_no || '',
    unit_no: searchParams.unit_no || '',
    status: searchParams.status || '',
    owner_name: searchParams.owner_name || '',
    phone: searchParams.phone || '',
    house_key: searchParams.house_key || '',
    space_type: searchParams.space_type || '',
  }
  const hasFilter = Object.values(params).some(v => v)
  const results = hasFilter ? await searchSpaces(params) : []
  const totalCount = results.length
  const totalAmount = results.reduce((s, r) => s + Number(r.price || 0), 0)

  return (
    <main className="print-wrap" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      <header className="flex query-no-print mb-4" style={{ justifyContent: 'space-between' }}>
        <div className="flex" style={{ gap: 10, alignItems: 'center' }}>
          <Link href="/dashboard" className="btn-ghost" style={{ fontSize: 13 }}>← 返回</Link>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>🔍 车位查询</h1>
        </div>
      </header>

      <section className="card mb-4 query-no-print">
        <QueryForm />
      </section>

      {hasFilter && (
        <p className="text-sm text-gray query-no-print mb-2">共找到 {results.length} 条结果</p>
      )}

      {hasFilter && (
        <>
          <QueryActions rows={results} />
          <section className="card print-area" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>车位号</th><th>区域</th><th>楼栋</th><th>类型</th>
                  <th>状态</th><th>业主</th><th>电话</th><th>房屋</th><th>价格</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-gray">无匹配结果</td></tr>
                )}
                {results.map(s => (
                  <tr key={s.space_id}>
                    <td style={{ fontWeight: 600 }}>{s.space_id}</td>
                    <td>{s.garage_zone}</td>
                    <td>{s.building_no}</td>
                    <td>{s.space_type}</td>
                    <td>
                      <span className={`badge ${
                        s.status === '已售' ? 'badge-blue' :
                        s.status === '预订' ? 'badge-yellow' :
                        s.status === '团购锁定' ? 'badge-orange' :
                        s.status === '已核销' ? 'badge-red' : 'badge-gray'
                      }`}>{s.status}</span>
                    </td>
                    <td>{s.owner_name || '-'}</td>
                    <td>{s.phone || '-'}</td>
                    <td>{s.house_key || '-'}</td>
                    <td>{s.price ? '¥' + Number(s.price).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
              {results.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700, background: '#fafafa' }}>
                    <td colSpan={8}>合计（{totalCount} 个车位）</td>
                    <td style={{ color: '#fa8c16' }}>¥{totalAmount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
        </>
      )}
    </main>
  )
}
