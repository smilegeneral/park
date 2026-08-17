'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CancelSpaceSlip, AddSpaceSlip, type SpaceManageOrder } from '../../components/doc-print'

export default function LogsClient({
  rows,
}: {
  rows: (SpaceManageOrder & { op_type: string })[]
}) {
  const [selectedNo, setSelectedNo] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const selected = rows.find(r => r.change_order_no === selectedNo) || null

  const handlePrint = () => {
    if (!selected) return
    setPrinting(true)
    // 等待 portal 渲染后再调用打印
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print()
        setPrinting(false)
      })
    })
  }

  return (
    <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>选择</th>
              <th>操作时间</th>
              <th>车位号</th>
              <th>变更单号</th>
              <th>操作类型</th>
              <th>变更前状态</th>
              <th>变更后状态</th>
              <th>原因</th>
              <th>操作人</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={9} className="text-center text-gray">暂无记录</td></tr>
            )}
            {rows.map((l) => {
              const checked = selectedNo === l.change_order_no
              return (
                <tr
                  key={l.change_order_no}
                  onClick={() => setSelectedNo(l.change_order_no)}
                  style={{ cursor: 'pointer', background: checked ? '#e6f4ff' : undefined }}
                >
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="radio"
                      name="log-select"
                      checked={checked}
                      onChange={() => setSelectedNo(l.change_order_no)}
                    />
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{l.apply_date}</td>
                  <td style={{ fontWeight: 600 }}>{l.space_id}</td>
                  <td>{l.change_order_no || '—'}</td>
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
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '12px 14px', background: '#fafafa', display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          className="btn-primary"
          disabled={!selected}
          onClick={handlePrint}
        >
          🖨️ 打印{selected?.op_type === '新增' ? '新增' : '取消'}车位单据
        </button>
        {selected && (
          <span className="text-xs text-gray">
            已选：{selected.op_type} · {selected.space_id} · {selected.change_order_no}
          </span>
        )}
        {!selected && <span className="text-xs text-gray">请先点击选择一条记录</span>}
      </div>

      {mounted && printing && selected && (
        <div className="print-only">
          {selected.op_type === '新增'
            ? <AddSpaceSlip order={selected} />
            : <CancelSpaceSlip order={selected} />}
        </div>
      )}
    </section>
  )
}
