'use client'
import { useState } from 'react'

// ============================================================
//  业务单据预览打印组件
//  支持：车位销售单、车位调换单
//  用法：将对应单据数据传入 DocPrintPanel，可下拉选择预览并打印
// ============================================================

export interface SaleOrder {
  sale_order_no: string
  space_id: string
  space_type?: string
  owner_name: string
  phone?: string
  house_key?: string
  amount: number
  receipt_no?: string
  confirm_no?: string
  remarks?: string
  sale_time?: string
}

export interface SwapOrder {
  swap_order_no: string
  owner_name: string
  phone?: string
  house_key?: string
  old_space_id: string
  old_space_type?: string
  old_space_price?: string
  price_difference?: number
  new_space_id: string
  new_space_type?: string
  new_space_price?: string
  change_reason?: string
  receipt_no?: string
  new_receipt_no?: string
  remarks?: string
  apply_date: string
}

const cellHead = { padding: '5px 10px', border: '1px solid #000', fontWeight: 600, textAlign: 'center' as const, background: '#fafafa', fontSize: 18 }
const cellVal = { padding: '5px 10px', border: '1px solid #000', textAlign: 'center' as const, fontSize: 18 }
const sigCell = { ...cellVal, height: 44 }

// ===================== 车位销售单 =====================
export function SaleSlip({ order }: { order: SaleOrder }) {
  return (
    <div className="print-area" style={slipBox}>
      <h2 style={{
        textAlign: 'center', fontSize: 22, fontWeight: 700, margin: '0 0 4px',
        fontFamily: '"SimHei", "黑体", serif',
      }}>
        车位销售单
      </h2>
      <div style={{ textAlign: 'right', fontSize: 14, marginBottom: 12 }}>
        销售单号：{order.sale_order_no}
      </div>

      <table style={slipTable}>
        <colgroup>
          <col style={{ width: '22%' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '28%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={cellHead}>车位号</td>
            <td style={cellVal}>{order.space_id}</td>
            <td style={cellHead}>车位类型</td>
            <td style={cellVal}>{order.space_type || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>业主姓名</td>
            <td style={cellVal}>{order.owner_name}</td>
            <td style={cellHead}>联系电话</td>
            <td style={cellVal}>{order.phone || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>房屋编号</td>
            <td style={cellVal}>{order.house_key || ''}</td>
            <td style={cellHead}>销售价格</td>
            <td style={cellVal}>{order.amount != null ? `¥${Number(order.amount).toFixed(0)}` : ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>收据编号</td>
            <td style={cellVal}>{order.receipt_no || ''}</td>
            <td style={cellHead}>确认书编号</td>
            <td style={cellVal}>{order.confirm_no || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>销售时间</td>
            <td colSpan={3} style={{ ...cellVal, textAlign: 'center' }}>
              {order.sale_time ? order.sale_time.slice(0, 19).replace('T', ' ') : ''}
            </td>
          </tr>
          <tr>
            <td style={cellHead}>备注</td>
            <td colSpan={3} style={{ ...cellVal, textAlign: 'left' }}>{order.remarks || ''}</td>
          </tr>
          <tr>
            <td colSpan={2} style={cellHead}>业主签字</td>
            <td colSpan={2} style={cellHead}>车位管理签字</td>
          </tr>
          <tr>
            <td colSpan={2} style={sigCell}>{''}</td>
            <td colSpan={2} style={sigCell}>{''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ===================== 车位调换单 =====================
export function SwapSlip({ order }: { order: SwapOrder }) {
  return (
    <div className="print-area" style={slipBox}>
      <h2 style={{
        textAlign: 'center', fontSize: 22, fontWeight: 700, margin: '0 0 4px',
        fontFamily: '"SimHei", "黑体", serif',
      }}>
        车位变更申请单
      </h2>
      <div style={{ textAlign: 'right', fontSize: 14, marginBottom: 12 }}>
        调换单号：{order.swap_order_no}
      </div>

      <table style={slipTable}>
        <colgroup>
          <col style={{ width: '20%' }} />
          <col style={{ width: '30%' }} />
          <col style={{ width: '25%' }} />
          <col style={{ width: '25%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={cellHead}>原车位号</td>
            <td style={cellVal}>{order.old_space_id}</td>
            <td style={cellHead}>楼栋-单元-房号</td>
            <td style={cellVal}>{order.house_key || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>原车位价格</td>
            <td style={cellVal}>{order.old_space_price ? `¥${Number(order.old_space_price).toFixed(0)}` : ''}</td>
            <td style={cellHead}>原车位类型</td>
            <td style={cellVal}>{order.old_space_type || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>业主姓名</td>
            <td style={cellVal}>{order.owner_name}</td>
            <td style={cellHead}>联系电话</td>
            <td style={cellVal}>{order.phone || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>变更后车位号</td>
            <td style={cellVal}>{order.new_space_id}</td>
            <td style={cellHead}>变更后车位类型</td>
            <td style={cellVal}>{order.new_space_type || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>变更后车位价格</td>
            <td style={cellVal}>{order.new_space_price ? `¥${Number(order.new_space_price).toFixed(0)}` : ''}</td>
            <td style={cellHead}>差价</td>
            <td style={cellVal}>{order.price_difference != null ? `¥${Number(order.price_difference).toFixed(0)}` : ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>原车位确认单号</td>
            <td style={cellVal}>{order.receipt_no || ''}</td>
            <td style={cellHead}>新车位确认单号</td>
            <td style={cellVal}>{order.new_receipt_no || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>变更原因</td>
            <td colSpan={3} style={{ ...cellVal, textAlign: 'left' }}>{order.change_reason || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>备注</td>
            <td colSpan={3} style={{ ...cellVal, textAlign: 'left' }}>{order.remarks || ''}</td>
          </tr>
          <tr>
            <td colSpan={2} style={cellHead}>业主签字</td>
            <td colSpan={2} style={cellHead}>车位管理签字</td>
          </tr>
          <tr>
            <td colSpan={2} style={sigCell}>{''}</td>
            <td colSpan={2} style={sigCell}>{''}</td>
          </tr>
          <tr>
            <td colSpan={2} style={cellHead}>分管领导签字</td>
            <td style={cellHead}>申请日期</td>
            <td style={{ ...cellVal, textAlign: 'center' }}>{order.apply_date}</td>
          </tr>
          <tr>
            <td colSpan={2} style={sigCell}>{''}</td>
            <td colSpan={2} style={sigCell}>{''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

const slipBox: React.CSSProperties = {
  background: '#fff', padding: '24px 28px', border: '1px solid #000',
  borderRadius: 4, maxWidth: 720, margin: '0 auto',
  fontFamily: '"SimSun", "宋体", serif',
}
const slipTable: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }

// ===================== 业务单据预览打印面板 =====================
// 根据传入的 saleOrder / swapOrder 数据，提供下拉选择并预览打印
export default function DocPrintPanel({
  saleOrder,
  swapOrder,
}: {
  saleOrder?: SaleOrder | null
  swapOrder?: SwapOrder | null
}) {
  const hasSale = !!saleOrder
  const hasSwap = !!swapOrder
  const [docType, setDocType] = useState<'sale' | 'swap'>(hasSale ? 'sale' : 'swap')

  // 没有可用单据时提示
  if (!hasSale && !hasSwap) return null

  const current: 'sale' | 'swap' = docType === 'sale' && hasSale ? 'sale'
    : docType === 'swap' && hasSwap ? 'swap'
      : hasSale ? 'sale' : 'swap'

  const data = current === 'sale' ? saleOrder : swapOrder

  function handlePrint() {
    if (typeof window !== 'undefined') window.print()
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: '#555' }}>
          业务单据：
          <select
            className="select"
            value={current}
            onChange={e => setDocType(e.target.value as 'sale' | 'swap')}
            style={{ marginLeft: 6 }}
          >
            {hasSale && <option value="sale">车位销售单</option>}
            {hasSwap && <option value="swap">车位调换单</option>}
          </select>
        </label>
        <button type="button" className="btn-primary" onClick={handlePrint} style={{ fontSize: 14 }}>
          🖨️ 预览打印
        </button>
      </div>

      {current === 'sale' && saleOrder && <SaleSlip order={saleOrder} />}
      {current === 'swap' && swapOrder && <SwapSlip order={swapOrder} />}
    </div>
  )
}
