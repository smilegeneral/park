import { getLifecycleLogs, getSpaceById } from '@/lib/queries'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import LogsClient from './logs-client'
import type { SpaceManageOrder } from '../components/doc-print'

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

  // 车位号留空则查全部（最多 500 条）；非空时按车位号模糊匹配
  const logs = await getLifecycleLogs(spaceId, 500)

  const filtered = opType ? logs.filter((l) => l.op_type === opType) : logs

  // 组装打印单据数据（补充车位详情）
  const rows: (SpaceManageOrder & { op_type: string; old_status?: string | null; new_status?: string | null; reason?: string | null; operator?: string | null })[] =
    await Promise.all(
      filtered.map(async (l) => {
        const sp = await getSpaceById(l.space_id)
        return {
          change_order_no: l.change_order_no || `${l.op_type === '新增' ? 'XZ' : 'QX'}-${l.log_id}`,
          space_id: l.space_id,
          garage_zone: sp?.garage_zone || '',
          space_type: sp?.space_type || '',
          building_no: sp?.building_no || '',
          house_key: sp?.house_key || '',
          owner_name: sp?.owner_name || '',
          price: sp?.price ?? '',
          remarks: '',
          reason: l.reason || '',
          operator: l.operator || '',
          apply_date: fmtTime(l.created_at),
          op_type: l.op_type,
          old_status: l.old_status,
          new_status: l.new_status,
        }
      })
    )

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
          <input className="form-input" name="space_id" defaultValue={spaceId} placeholder="如 A-246（留空查全部，支持模糊）" />
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

      <LogsClient rows={rows} />
    </main>
  )
}
