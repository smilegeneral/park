'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SpaceChangeLog } from '@/lib/types'
import DocPrintPanel from '@/app/dashboard/components/doc-print'

// 兼容 Date / string 的时间格式化
function fmtTime(v: any, len = 16): string {
  if (!v) return ''
  const s = v instanceof Date ? v.toISOString() : String(v)
  return s.slice(0, len)
}

function fmtMoney(v: any): string {
  const n = Number(v || 0)
  return n ? `¥${n.toLocaleString()}` : '—'
}

export default function ChangeLogTable({
  logs,
  initialQ = '',
}: {
  logs: SpaceChangeLog[]
  initialQ?: string
}) {
  const router = useRouter()
  const [q, setQ] = useState(initialQ)
  const [detail, setDetail] = useState<SpaceChangeLog | null>(null)
  const [printLog, setPrintLog] = useState<SpaceChangeLog | null>(null)
  const [printDoc, setPrintDoc] = useState<'apply' | 'plate'>('apply')

  // ESC 关闭抽屉 / 打印预览
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDetail(null)
        setPrintLog(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function doSearch(e: React.FormEvent) {
    e.preventDefault()
    const kw = q.trim()
    router.push(kw ? `/dashboard/logs?q=${encodeURIComponent(kw)}` : '/dashboard/logs')
  }

  // 详情字段展示
  const detailRows: [string, string][] = detail
    ? [
        ['调换单号', detail.swap_order_no || '—'],
        ['业主姓名', detail.owner_name],
        ['联系电话', detail.phone || '—'],
        ['原车位号', detail.old_space_no],
        ['原车位类型', detail.old_space_type || '—'],
        ['原房号', detail.old_house_key || '—'],
        ['原车位价格', fmtMoney(detail.old_space_price)],
        ['新车位号', detail.new_space_no],
        ['新车位类型', detail.new_space_type || '—'],
        ['新房号', detail.new_house_key || '—'],
        ['新车位价格', fmtMoney(detail.new_space_price)],
        ['差价', fmtMoney(detail.price_difference)],
        ['原车位确认单号', detail.receipt_no || '—'],
        ['新车位确认单号', detail.new_receipt_no || '—'],
        ['变更类型', detail.swap_type || '—'],
        ['变更原因', detail.change_reason || '—'],
        ['备注', detail.remarks || '—'],
        ['经办人', detail.operator || '—'],
        ['办理状态', detail.process_result || '—'],
        ['变更时间', fmtTime(detail.changed_at, 19)],
      ]
    : []

  return (
    <>
      {/* 搜索栏 */}
      <form className="card flex" onSubmit={doSearch} style={{ gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <input
          className="form-input"
          placeholder="输入车位号 / 房号 / 业主姓名 模糊查询"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-primary" style={{ fontSize: 14 }}>
          查询
        </button>
        {initialQ && (
          <Link href="/dashboard/logs" className="btn-secondary" style={{ fontSize: 13 }}>
            清除
          </Link>
        )}
        <span className="text-sm text-gray" style={{ marginLeft: 8 }}>
          共 {logs.length} 条
        </span>
      </form>

      {/* 结果列表 */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>业主</th>
                <th>原车位</th>
                <th>新车位</th>
                <th>差价</th>
                <th>类型</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={8} className="text-center text-gray">暂无变更记录</td></tr>
              )}
              {logs.map(l => (
                <tr
                  key={l.log_id}
                  onClick={() => setDetail(l)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtTime(l.changed_at)}</td>
                  <td>{l.owner_name}</td>
                  <td style={{ fontWeight: 600 }}>{l.old_space_no}</td>
                  <td style={{ fontWeight: 600, color: '#1677ff' }}>{l.new_space_no}</td>
                  <td style={{ color: l.price_difference > 0 ? '#fa8c16' : '#333' }}>
                    {l.price_difference > 0 ? '+' : ''}{fmtMoney(l.price_difference)}
                  </td>
                  <td>
                    <span className={`badge ${l.swap_type === '加钱换车位' ? 'badge-orange' : 'badge-blue'}`}>
                      {l.swap_type}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${l.process_result === '已完成' ? 'badge-green' : 'badge-gray'}`}>
                      {l.process_result}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={(e) => { e.stopPropagation(); setDetail(l) }}
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 右侧抽屉详情 */}
      {detail && (
        <div className="drawer-mask" onClick={() => setDetail(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>变更记录详情 #{detail.log_id}</h3>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: 13 }}
                onClick={() => setDetail(null)}
              >
                ✕ 关闭
              </button>
            </div>
            <div className="drawer-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                {detailRows.map(([k, v]) => (
                  <div key={k} className="flex" style={{ borderBottom: '1px dashed #eee', padding: '6px 0' }}>
                    <span style={{ width: 100, color: '#888', fontSize: 13, flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 14, wordBreak: 'break-all' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="drawer-foot">
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: 14, flex: 1 }}
                onClick={() => { setPrintLog(detail); setPrintDoc('apply') }}
              >
                🖨️ 补打申请单
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: 14, flex: 1 }}
                onClick={() => { setPrintLog(detail); setPrintDoc('plate') }}
              >
                🖨️ 车位牌
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 打印预览面板 */}
      {printLog && (
        <div className="no-print" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: 13, marginBottom: 8 }}
            onClick={() => setPrintLog(null)}
          >
            ✕ 关闭预览
          </button>
        </div>
      )}
      {printLog && (
        <DocPrintPanel
          changeLog={printLog}
          initialDoc={printDoc}
        />
      )}
    </>
  )
}
