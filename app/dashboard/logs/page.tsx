import { getChangeLogs } from '@/lib/queries'
import Link from 'next/link'

// ============================================================
//  变更日志 - 车位调换/核销全留痕
// ============================================================

export default async function LogsPage() {
  const logs = await getChangeLogs(100)

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>📜 变更日志</h1>
          <p className="text-sm text-gray">车位调换/核销操作全记录</p>
        </div>
        <Link href="/dashboard" style={{ fontSize: 14 }}>← 返回</Link>
      </header>

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>业主</th>
                <th>原车位</th>
                <th>原价格</th>
                <th>新车位</th>
                <th>新价格</th>
                <th>差价</th>
                <th>类型</th>
                <th>原因</th>
                <th>经办人</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={11} className="text-center text-gray">暂无变更记录</td></tr>
              )}
              {logs.map(l => (
                <tr key={l.log_id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{l.changed_at?.slice(0, 16)}</td>
                  <td>{l.owner_name}</td>
                  <td style={{ fontWeight: 600 }}>{l.old_space_no}</td>
                  <td>¥{Number(l.old_space_price || 0).toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: '#1677ff' }}>{l.new_space_no}</td>
                  <td>¥{Number(l.new_space_price || 0).toLocaleString()}</td>
                  <td style={{ color: l.price_difference > 0 ? '#fa8c16' : '#333' }}>
                    {l.price_difference > 0 ? '+' : ''}{Number(l.price_difference || 0).toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${l.swap_type === '业主互调' ? 'badge-blue' : 'badge-orange'}`}>
                      {l.swap_type}
                    </span>
                  </td>
                  <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.change_reason}
                  </td>
                  <td>{l.operator}</td>
                  <td>
                    <span className={`badge ${l.process_result === '已完成' ? 'badge-green' : 'badge-gray'}`}>
                      {l.process_result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
