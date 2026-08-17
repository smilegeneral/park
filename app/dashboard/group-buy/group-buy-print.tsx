'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { GroupBuyPurchase, GroupBuyVerifyDetail } from '@/lib/types'

// ============================================================
//  团购单据打印组件
//  - 车位团购单（参照车位销售单样式）
//  - 团购车位核销单（参照车位销售单样式，含核销明细全部字段）
// ============================================================

const slipBox: React.CSSProperties = {
  background: '#fff', padding: '24px 28px', border: '1px solid #000',
  borderRadius: 4, maxWidth: 760, margin: '0 auto',
  fontFamily: '"SimSun", "宋体", serif',
}
const slipTable: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }
const cellHead = { padding: '5px 10px', border: '1px solid #000', fontWeight: 600, textAlign: 'center' as const, background: '#fafafa', fontSize: 16 }
const cellVal = { padding: '5px 10px', border: '1px solid #000', textAlign: 'center' as const, fontSize: 16 }
const sigCell = { ...cellVal, height: 46 }
const label = { fontSize: 13, color: '#444' }

function fmtDate(v: any): string {
  if (!v) return '-'
  const d = v instanceof Date ? v : new Date(v)
  if (isNaN(d.getTime())) return String(v).slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ===================== 车位团购单 =====================
export function PurchaseSlip({ p }: { p: GroupBuyPurchase }) {
  const orderNo = `TG${String(p.purchase_id).padStart(3, '0')}`
  return (
    <div className="print-area slip-201" style={slipBox}>
      <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, margin: '0 0 4px', fontFamily: '"SimHei","黑体",serif' }}>
        车位团购单
      </h2>
      <div style={{ textAlign: 'right', fontSize: 14, marginBottom: 12 }}>团购单号：{orderNo}</div>
      <table style={slipTable}>
        <colgroup>
          <col style={{ width: '22%' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '28%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={cellHead}>团购公司</td>
            <td colSpan={3} style={{ ...cellVal, textAlign: 'left' }}>{p.company_name}</td>
          </tr>
          <tr>
            <td style={cellHead}>所属部门</td>
            <td style={cellVal}>{p.department || '-'}</td>
            <td style={cellHead}>联系人</td>
            <td style={cellVal}>{p.contact_person || '-'}</td>
          </tr>
          <tr>
            <td style={cellHead}>联系电话</td>
            <td style={cellVal}>{p.contact_phone || '-'}</td>
            <td style={cellHead}>购买车位数量</td>
            <td style={cellVal}>{p.space_count}</td>
          </tr>
          <tr>
            <td style={cellHead}>车位号列表</td>
            <td colSpan={3} style={{ ...cellVal, textAlign: 'left' }}>{p.space_list || '-'}</td>
          </tr>
          <tr>
            <td style={cellHead}>价格</td>
            <td style={cellVal}>{p.amount != null ? `¥${Number(p.amount).toFixed(0)}` : ''}</td>
            <td style={cellHead}>是否付款</td>
            <td style={cellVal}>{p.is_paid ? '是' : '否'}</td>
          </tr>
          <tr>
            <td style={cellHead}>发票类型</td>
            <td style={cellVal}>{p.invoice_type || '-'}</td>
            <td style={cellHead}>销售日期</td>
            <td style={cellVal}>{fmtDate(p.created_at)}</td>
          </tr>
          <tr>
            <td style={cellHead}>备注</td>
            <td colSpan={3} style={{ ...cellVal, textAlign: 'left' }}>{p.remarks || ''}</td>
          </tr>
          <tr>
            <td colSpan={2} style={cellHead}>车位销售签字</td>
            <td colSpan={2} style={cellHead}>团购公司代表签字</td>
          </tr>
          <tr>
            <td colSpan={2} style={sigCell}></td>
            <td colSpan={2} style={sigCell}></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ===================== 团购车位核销单 =====================
export function VerifySlip({ v }: { v: GroupBuyVerifyDetail }) {
  const orderNo = `GCV${String(v.verify_id).padStart(3, '0')}`
  return (
    <div className="print-area slip-201" style={slipBox}>
      <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, margin: '0 0 4px', fontFamily: '"SimHei","黑体",serif' }}>
        团购车位核销单
      </h2>
      <div style={{ textAlign: 'right', fontSize: 14, marginBottom: 12 }}>核销单号：{orderNo}</div>
      <table style={slipTable}>
        <colgroup>
          <col style={{ width: '22%' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '28%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={cellHead}>团购公司</td>
            <td style={cellVal}>{v.company_name || '-'}</td>
            <td style={cellHead}>车位号</td>
            <td style={cellVal}>{v.space_id || '-'}</td>
          </tr>
          <tr>
            <td style={cellHead}>房号</td>
            <td style={cellVal}>{v.house_key || '-'}</td>
            <td style={cellHead}>业主姓名</td>
            <td style={cellVal}>{v.owner_name || '-'}</td>
          </tr>
          <tr>
            <td style={cellHead}>联系电话</td>
            <td style={cellVal}>{v.owner_phone || '-'}</td>
            <td style={cellHead}>销售金额</td>
            <td style={cellVal}>{v.sale_amount != null ? `¥${Number(v.sale_amount).toFixed(0)}` : ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>车位确认单号</td>
            <td style={cellVal}>{v.receipt_no || '-'}</td>
            <td style={cellHead}>核销日期</td>
            <td style={cellVal}>{fmtDate(v.verify_date)}</td>
          </tr>
          <tr>
            <td style={cellHead}>经办人</td>
            <td style={cellVal}>{v.operator || '-'}</td>
            <td style={cellHead}>登记时间</td>
            <td style={cellVal}>{fmtDate(v.created_at)}</td>
          </tr>
          <tr>
            <td style={cellHead}>备注</td>
            <td colSpan={3} style={{ ...cellVal, textAlign: 'left' }}>{v.remarks || ''}</td>
          </tr>
          <tr>
            <td colSpan={2} style={cellHead}>车位销售签字</td>
            <td colSpan={2} style={cellHead}>业主签字</td>
          </tr>
          <tr>
            <td colSpan={2} style={sigCell}></td>
            <td colSpan={2} style={sigCell}></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ===================== 打印预览按钮 + 弹层 =====================
function PrintButton({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // 屏幕预览（在弹层内，打印时隐藏）；打印副本渲染到 body，逃逸 no-print 以正常打印
  const printCopy =
    mounted && open
      ? createPortal(<div className="print-only">{children}</div>, document.body)
      : null

  return (
    <>
      <button
        type="button"
        className="btn-secondary no-print"
        style={{ fontSize: 12, padding: '2px 8px', whiteSpace: 'nowrap' }}
        onClick={() => setOpen(true)}
      >
        {title}
      </button>
      {open && (
        <div
          className="no-print"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            overflowY: 'auto', padding: '24px',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 6, padding: 16, minWidth: 760 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }} className="no-print">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>关闭</button>
              <button type="button" className="btn-primary" onClick={() => window.print()}>🖨️ 打印</button>
            </div>
          </div>
        </div>
      )}
      {printCopy}
    </>
  )
}

export function PurchaseSlipButton({ p }: { p: GroupBuyPurchase }) {
  return <PrintButton title="补打团购单"><PurchaseSlip p={p} /></PrintButton>
}

export function VerifySlipButton({ v }: { v: GroupBuyVerifyDetail }) {
  return <PrintButton title="打印核销单"><VerifySlip v={v} /></PrintButton>
}
