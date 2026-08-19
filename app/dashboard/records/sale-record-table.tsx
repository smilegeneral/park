'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ParkingSaleRecord } from '@/lib/types'
import DocPrintPanel from '@/app/dashboard/components/doc-print'
import type { SaleOrder } from '@/app/dashboard/components/doc-print'
import SpacePlateUploader from '@/app/dashboard/records/space-plate-uploader'

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

export default function SaleRecordTable({
  records,
  initialQ = '',
  initialYear,
}: {
  records: ParkingSaleRecord[]
  initialQ?: string
  initialYear?: number
}) {
  const router = useRouter()
  const [q, setQ] = useState(initialQ)
  const [year, setYear] = useState<number | ''>(initialYear ?? '')
  const [detail, setDetail] = useState<ParkingSaleRecord | null>(null)
  const [printOrder, setPrintOrder] = useState<SaleOrder | null>(null)
  const [mounted, setMounted] = useState(false)
  const [printList, setPrintList] = useState(false)
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [plateTarget, setPlateTarget] = useState<ParkingSaleRecord | null>(null)
  const [sort, setSort] = useState<{ key: keyof ParkingSaleRecord | null; dir: 'asc' | 'desc' }>({ key: null, dir: 'asc' })

  function toggleSort(key: keyof ParkingSaleRecord) {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    )
  }
  function sortRecords(list: ParkingSaleRecord[]) {
    if (!sort.key) return list
    const dir = sort.dir === 'asc' ? 1 : -1
    const key = sort.key
    return [...list].sort((a, b) => {
      const va = a[key] as any
      const vb = b[key] as any
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      const sa = String(va ?? '')
      const sb = String(vb ?? '')
      return sa.localeCompare(sb, 'zh') * dir
    })
  }
  const viewRecords = sortRecords(records)

  const allChecked = records.length > 0 && selected.size === records.length
  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(records.map(r => r.record_id)))
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
        setPrintOrder(null)
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

  // 统计：基于当前筛选结果（records）计算总记录数与总金额
  const totalAmount = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  // 打印清单：仅统计已勾选记录的车位个数与金额合计
  const printSelected = viewRecords.filter(r => selected.has(r.record_id))
  const printAmount = printSelected.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  const yearOptions = (() => {
    const cur = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => cur - i)
  })()

  function doSearch(e: React.FormEvent) {
    e.preventDefault()
    const kw = q.trim()
    const params = new URLSearchParams()
    if (kw) params.set('q', kw)
    if (year !== '') params.set('y', String(year))
    const qs = params.toString()
    router.push(qs ? `/dashboard/records?${qs}` : '/dashboard/records')
  }

  // 把 ParkingSaleRecord 适配为 SaleOrder 供打印
  function toSaleOrder(r: ParkingSaleRecord): SaleOrder {
    return {
      sale_order_no: r.sale_order_no,
      space_id: r.space_no,
      space_type: r.space_type,
      owner_name: r.owner_name,
      phone: r.phone,
      house_key: r.house_key,
      amount: r.amount,
      receipt_no: r.receipt_no,
      confirm_no: r.confirmation_no,
      remarks: r.remarks,
      sale_time: fmtTime(r.sale_time, 10),
    }
  }

  const detailRows: [string, string][] = detail
    ? [
        ['销售单号', detail.sale_order_no],
        ['车位号', detail.space_no],
        ['车位类型', detail.space_type || '—'],
        ['楼栋/单元/房号', detail.house_key || '—'],
        ['房间号', detail.room_no || '—'],
        ['业主姓名', detail.owner_name],
        ['联系电话', detail.phone || '—'],
        ['销售金额', fmtMoney(detail.amount)],
        ['销售时间', fmtTime(detail.sale_time, 19)],
        ['收据号', detail.receipt_no || '—'],
        ['确认单号', detail.confirmation_no || '—'],
        ['是否团购', detail.is_group_buy || '—'],
        ['团购单位', detail.group_company || '—'],
        ['状态', detail.status || '—'],
        ['办理结果', detail.process_result || '—'],
        ['备注', detail.remarks || '—'],
        ['录入时间', fmtTime(detail.created_at, 19)],
      ]
    : []

  return (
    <>
      {/* 搜索栏 */}
      <form className="card flex" onSubmit={doSearch} style={{ gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}
          className="text-sm"
          style={{ padding: '6px 8px' }}
        >
          <option value="">全部年份</option>
          {yearOptions.map(y => <option key={y} value={y}>{y} 年</option>)}
        </select>
        <input
          className="form-input"
          placeholder="输入车位号 / 房号 / 业主姓名 / 销售单号 模糊查询"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-primary" style={{ fontSize: 14 }}>
          查询
        </button>
        {initialQ && (
          <Link href="/dashboard/records" className="btn-secondary" style={{ fontSize: 13 }}>
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
          共 {records.length} 条，已选 {selected.size} 条
        </span>
        <span className="text-sm" style={{ marginLeft: 8, fontWeight: 600, color: '#1677ff' }}>
          销售车位 {records.length} 个 · 总金额 ¥{totalAmount.toLocaleString()}
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
                <th onClick={() => toggleSort('sale_order_no')} style={{ cursor: 'pointer' }}>
                  销售单号{sort.key === 'sale_order_no' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => toggleSort('space_no')} style={{ cursor: 'pointer' }}>
                  车位号{sort.key === 'space_no' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => toggleSort('space_type')} style={{ cursor: 'pointer' }}>
                  类型{sort.key === 'space_type' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => toggleSort('house_key')} style={{ cursor: 'pointer' }}>
                  房屋{sort.key === 'house_key' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => toggleSort('owner_name')} style={{ cursor: 'pointer' }}>
                  业主{sort.key === 'owner_name' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => toggleSort('phone')} style={{ cursor: 'pointer' }}>
                  电话{sort.key === 'phone' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => toggleSort('amount')} style={{ cursor: 'pointer' }}>
                  金额{sort.key === 'amount' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => toggleSort('sale_time')} style={{ cursor: 'pointer' }}>
                  时间{sort.key === 'sale_time' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>
                  状态{sort.key === 'status' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => toggleSort('is_group_buy')} style={{ cursor: 'pointer' }}>
                  团购{sort.key === 'is_group_buy' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr><td colSpan={12} className="text-center text-gray">暂无销售记录</td></tr>
              )}
              {viewRecords.map(r => (
                <tr
                  key={r.record_id}
                  onClick={() => setDetail(r)}
                  style={{ cursor: 'pointer' }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(r.record_id)}
                      onChange={() => toggleOne(r.record_id)}
                    />
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.sale_order_no}</td>
                  <td style={{ fontWeight: 600 }}>{r.space_no}</td>
                  <td>{r.space_type}</td>
                  <td>{r.house_key}</td>
                  <td>{r.owner_name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{r.phone}</td>
                  <td style={{ color: '#fa8c16', fontWeight: 600 }}>{fmtMoney(r.amount)}</td>
                  <td style={{ fontSize: 12 }}>{fmtTime(r.sale_time, 10)}</td>
                  <td>
                    <span className={`badge ${r.status === '已确认' ? 'badge-blue' : 'badge-gray'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.is_group_buy === '是' ? '✅' : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '2px 8px', fontSize: 12, marginRight: 6 }}
                      onClick={(e) => { e.stopPropagation(); setDetail(r) }}
                    >
                      查看详情
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '2px 8px', fontSize: 12, opacity: r.process_result === '已完成' ? 0.5 : 1, cursor: r.process_result === '已完成' ? 'not-allowed' : 'pointer' }}
                      disabled={r.process_result === '已完成'}
                      onClick={(e) => { e.stopPropagation(); if (r.process_result !== '已完成') setPlateTarget(r) }}
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
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>销售记录详情 #{detail.record_id}</h3>
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
                onClick={() => setPrintOrder(toSaleOrder(detail))}
              >
                🖨️ 补打销售单
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
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>上传车位牌照片 · 车位 {plateTarget.space_no}</h3>
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
              <SpacePlateUploader recordId={plateTarget.record_id} spaceNo={plateTarget.space_no} />
            </div>
          </div>
        </div>
      )}

      {/* 打印预览面板 */}
      {printOrder && (
        <div className="no-print" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: 13, marginBottom: 8 }}
            onClick={() => setPrintOrder(null)}
          >
            ✕ 关闭预览
          </button>
        </div>
      )}
      {printOrder && (
        <DocPrintPanel saleOrder={printOrder} initialDoc="sale" />
      )}

      {/* 打印销售记录列表（portal 到 body，避免被隐藏的 main 祖先遮挡） */}
      {printList && mounted && createPortal(
        <div className="print-only">
          <div className="print-area" style={{ padding: 12 }}>
            <h2 style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>
              销售记录清单
            </h2>
            <table>
              <thead>
                <tr>
                  <th>销售单号</th>
                  <th>车位号</th>
                  <th>类型</th>
                  <th>房屋</th>
                  <th>金额</th>
                  <th>时间</th>
                  <th>状态</th>
                  <th>团购</th>
                </tr>
              </thead>
              <tbody>
                {printSelected.map(r => (
                  <tr key={r.record_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.sale_order_no}</td>
                    <td style={{ fontWeight: 600 }}>{r.space_no}</td>
                    <td>{r.space_type}</td>
                    <td>{r.house_key}</td>
                    <td style={{ fontWeight: 600 }}>{fmtMoney(r.amount)}</td>
                    <td style={{ fontSize: 12 }}>{fmtTime(r.sale_time, 10)}</td>
                    <td>{r.status}</td>
                    <td>{r.is_group_buy === '是' ? '是' : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, borderTop: '2px solid #000' }}>
                  <td colSpan={4} style={{ textAlign: 'right' }}>合计</td>
                  <td>车位 {printSelected.length} 个</td>
                  <td colSpan={2} style={{ fontWeight: 700 }}>¥{printAmount.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
