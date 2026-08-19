'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SpaceChangeLog } from '@/lib/types'
import DocPrintPanel from '@/app/dashboard/components/doc-print'
import ChangeLogPlateUploader from '@/app/dashboard/logs/change-log-plate-uploader'

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
  const [mounted, setMounted] = useState(false)
  const [printList, setPrintList] = useState(false)
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [plateTarget, setPlateTarget] = useState<SpaceChangeLog | null>(null)

  const allChecked = logs.length > 0 && selected.size === logs.length
  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(logs.map(l => l.log_id)))
  }
  function toggleOne(id: string | number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function handlePrintSelected() {
    if (selected.size === 0) {
      alert('请先勾选要打印的记录')
      return
    }
    setPrintList(true)
  }

  // ESC 关闭抽屉 / 打印预览
  useEffect(() => {
    setMounted(true)
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDetail(null)
        setPrintLog(null)
        setPlateTarget(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 打印列表：渲染后立即调用浏览器打印，结束后关闭
  useEffect(() => {
    if (!printList) return
    const t = setTimeout(() => {
      window.print()
      setPrintList(false)
    }, 50)
    return () => clearTimeout(t)
  }, [printList])

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
        <button
          type="button"
          className="btn-secondary"
          style={{ fontSize: 13, marginLeft: 8 }}
          onClick={toggleAll}
        >
          {allChecked ? '取消全选' : '全选'}
        </button>
        <span className="text-sm text-gray" style={{ marginLeft: 8 }}>
          共 {logs.length} 条，已选 {selected.size} 条
        </span>
        <button
          type="button"
          className="btn-secondary"
          style={{ fontSize: 13, marginLeft: 8 }}
          onClick={handlePrintSelected}
        >
          🖨️ 打印勾选
        </button>
      </form>

      {/* 结果列表 */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
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
                <tr><td colSpan={9} className="text-center text-gray">暂无变更记录</td></tr>
              )}
              {logs.map(l => (
                <tr
                  key={l.log_id}
                  onClick={() => setDetail(l)}
                  style={{ cursor: 'pointer' }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(l.log_id)}
                      onChange={() => toggleOne(l.log_id)}
                    />
                  </td>
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
                      style={{ padding: '2px 8px', fontSize: 12, marginRight: 6 }}
                      onClick={(e) => { e.stopPropagation(); setDetail(l) }}
                    >
                      查看详情
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '2px 8px', fontSize: 12, opacity: l.process_result === '已完成' ? 0.5 : 1, cursor: l.process_result === '已完成' ? 'not-allowed' : 'pointer' }}
                      disabled={l.process_result === '已完成'}
                      onClick={(e) => { e.stopPropagation(); if (l.process_result !== '已完成') setPlateTarget(l) }}
                    >
                      上传车位牌照片
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

      {/* 上传车位牌照片弹窗 */}
      {plateTarget && (
        <div className="drawer-mask" onClick={() => setPlateTarget(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="drawer-head">
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>上传车位牌照片 · 新车位 {plateTarget.new_space_no}</h3>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: 13 }}
                onClick={() => setPlateTarget(null)}
              >
                ✕ 关闭
              </button>
            </div>
            <div className="drawer-body">
              <ChangeLogPlateUploader logId={plateTarget.log_id} spaceNo={plateTarget.new_space_no} />
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

      {/* 打印变更记录列表（portal 到 body，避免被隐藏的 main 祖先遮挡） */}
      {printList && mounted && createPortal(
        <div className="print-only">
          <div className="print-area" style={{ padding: 12 }}>
            <h2 style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>
              变更记录清单
            </h2>
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>旧房号</th>
                  <th>业主</th>
                  <th>原车位</th>
                  <th>新车位</th>
                  <th>新房号</th>
                  <th>类型</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {logs.filter(l => selected.has(l.log_id)).map(l => (
                  <tr key={l.log_id}>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtTime(l.changed_at)}</td>
                    <td>{l.old_house_key || '—'}</td>
                    <td>{l.owner_name}</td>
                    <td style={{ fontWeight: 600 }}>{l.old_space_no}</td>
                    <td style={{ fontWeight: 600, color: '#1677ff' }}>{l.new_space_no}</td>
                    <td>{l.new_house_key || '—'}</td>
                    <td>{l.swap_type}</td>
                    <td>{l.process_result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
