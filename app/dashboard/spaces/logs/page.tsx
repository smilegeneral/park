import { getLifecycleLogs } from '@/lib/queries'
import Link from 'next/link'
import { redirect } from 'next/navigation'

// ============================================================
//  车位台账变更日志 - 新增/取消记录查询（服务端组件）
// ============================================================

function fmtTime(t: any) {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return String(t).slice(0, 16)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const OP_TYPES = [
  { value: '', label: '全部类型' },
  { value: '新增', label: '新增车位' },
  { value: '取消', label: '取消车位' },
]

export default async function SpaceLifecycleLogsPage({
  searchParams,
}: {
  searchParams: { space_id?: string; op_type?: string }
}) {
  const spaceId = (searchParams.space_id || '').trim()
  const opType = (searchParams.op_type || '').trim()

  // 仅在给出车位号时查询，避免初次进入拉取全表
  const logs = spaceId
    ? await getLifecycleLogs(spaceId, 500)
    : []

  const filtered = opType ? logs.filter((l) => l.op_type === opType) : logs

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      {/* 顶部标题区 */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20, flexWrap: 'wrap', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 6, height: 44, borderRadius: 4,
              background: 'linear-gradient(180deg,#1677ff,#52c41a)',
            }}
          />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: .5 }}>📋 车位台账变更日志</h1>
            <p className="text-sm text-gray">记录车位新增 / 取消的时间、原因与操作人</p>
          </div>
        </div>
        <Link href="/dashboard" className="btn-ghost">← 返回首页</Link>
      </div>

      {/* 筛选表单（GET 提交，查询在服务端执行） */}
      <form method="get" className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-row" style={{ margin: 0 }}>
          <label className="form-label">车位号</label>
          <input className="form-input" name="space_id" defaultValue={spaceId} placeholder="如 A-001（留空查全部）" />
        </div>
        <div className="form-row" style={{ margin: 0 }}>
          <label className="form-label">操作类型</label>
          <select className="form-input" name="op_type" defaultValue={opType}>
            {OP_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary">🔍 查询</button>
        {spaceId && (
          <Link href="/dashboard/spaces/logs" className="btn-ghost">重置</Link>
        )}
      </form>

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>操作时间</th>
                <th>车位号</th>
                <th>操作类型</th>
                <th>变更前状态</th>
                <th>变更后状态</th>
                <th>原因</th>
                <th>操作人</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray">
                  {spaceId ? '暂无记录' : '💡 请输入车位号后点击「查询」'}
                </td></tr>
              )}
              {filtered.map((l) => (
                <tr key={l.log_id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtTime(l.created_at)}</td>
                  <td style={{ fontWeight: 600 }}>{l.space_id}</td>
                  <td>
                    <span className={`badge ${l.op_type === '新增' ? 'badge-green' : 'badge-orange'}`}>
                      {l.op_type}
                    </span>
                  </td>
                  <td>{l.old_status || '—'}</td>
                  <td>{l.new_status || '—'}</td>
                  <td style={{ maxWidth: 220, whiteSpace: 'pre-wrap' }}>{l.reason || '—'}</td>
                  <td>{l.operator || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 0 && (
            <div className="text-xs text-gray" style={{ padding: '10px 14px', background: '#fafafa' }}>
              共 <b>{filtered.length}</b> 条{opType ? `（已按「${opType}」过滤）` : ''}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
