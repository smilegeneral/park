'use client'
import { useCallback, useState, useTransition } from 'react'
import { getLifecycleLogs } from '@/lib/queries'
import type { SpaceLifecycleLog } from '@/lib/queries'
import Link from 'next/link'

const OP_TYPES = [
  { value: '', label: '全部类型' },
  { value: '新增', label: '新增车位' },
  { value: '取消', label: '取消车位' },
]

function fmtTime(t: any) {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return String(t).slice(0, 16)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function SpaceLifecycleLogsPage() {
  const [logs, setLogs] = useState<SpaceLifecycleLog[]>([])
  const [loaded, setLoaded] = useState(false)
  const [spaceId, setSpaceId] = useState('')
  const [opType, setOpType] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // 本地筛选：先拉取（可带车位号），再用类型在前端过滤
  const doQuery = useCallback(
    (sid: string) => {
      setError('')
      startTransition(async () => {
        try {
          const list = await getLifecycleLogs(sid.trim() || undefined, 500)
          setLogs(list)
          setLoaded(true)
        } catch (e: any) {
          setError(`❌ 查询失败：${e.message}`)
          setLoaded(true)
        }
      })
    },
    []
  )

  const filtered = opType ? logs.filter((l) => l.op_type === opType) : logs

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>📋 车位台账变更日志</h2>
          <div className="text-sm text-gray" style={{ marginTop: 4 }}>记录车位新增 / 取消的时间、原因与操作人</div>
        </div>
        <Link href="/dashboard/spaces/manage" className="btn-ghost">← 车位管理</Link>
      </div>

      {/* 筛选区 */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <div className="form-row" style={{ margin: 0 }}>
          <label className="form-label">车位号</label>
          <input
            className="form-input"
            value={spaceId}
            placeholder="如 A-001（留空查全部）"
            onChange={(e) => setSpaceId(e.target.value)}
          />
        </div>
        <div className="form-row" style={{ margin: 0 }}>
          <label className="form-label">操作类型</label>
          <select className="form-input" value={opType} onChange={(e) => setOpType(e.target.value)}>
            {OP_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button type="button" className="btn-primary" onClick={() => doQuery(spaceId)} disabled={pending}>
          {pending ? '查询中…' : '查询'}
        </button>
        {loaded && (
          <button type="button" className="btn-ghost" onClick={() => { setSpaceId(''); setOpType(''); setLogs([]); setLoaded(false) }}>
            重置
          </button>
        )}
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {!loaded ? (
        <div className="text-sm text-gray">请输入条件后点击「查询」，或留空查询全部记录。</div>
      ) : (
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
                <tr><td colSpan={7} className="text-center text-gray">暂无记录</td></tr>
              )}
              {filtered.map((l) => (
                <tr key={l.log_id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtTime(l.created_at)}</td>
                  <td style={{ fontWeight: 600 }}>{l.space_id}</td>
                  <td>
                    <span className={`badge ${l.op_type === '新增' ? 'badge-green' : 'badge-red'}`}>
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
          <div className="text-xs text-gray" style={{ marginTop: 8 }}>
            共 {filtered.length} 条{opType ? `（已按「${opType}」过滤）` : ''}
          </div>
        </div>
      )}
    </div>
  )
}
