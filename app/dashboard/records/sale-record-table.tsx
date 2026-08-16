'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ParkingSaleRecord } from '@/lib/types'
import DocPrintPanel from '@/app/dashboard/components/doc-print'
import type { SaleOrder } from '@/app/dashboard/components/doc-print'

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
}: {
  records: ParkingSaleRecord[]
  initialQ?: string
}) {
  const router = useRouter()
  const [q, setQ] = useState(initialQ)
  const [detail, setDetail] = useState<ParkingSaleRecord | null>(null)
  const [printOrder, setPrintOrder] = useState<SaleOrder | null>(null)

  // ESC 关闭抽屉 / 打印预览
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDetail(null)
        setPrintOrder(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function doSearch(e: React.FormEvent) {
    e.preventDefault()
    const kw = q.trim()
    router.push(kw ? `/dashboard/records?q=${encodeURIComponent(kw)}` : '/dashboard/records')
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
        <span className="text-sm text-gray" style={{ marginLeft: 8 }}>
          共 {records.length} 条
        </span>
      </form>

      {/* 结果列表 */}
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
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr><td colSpan={11} className="text-center text-gray">暂无销售记录</td></tr>
              )}
              {records.map(r => (
                <tr
                  key={r.record_id}
                  onClick={() => setDetail(r)}
                  style={{ cursor: 'pointer' }}
                >
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
                      style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={(e) => { e.stopPropagation(); setDetail(r) }}
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
    </>
  )
}
