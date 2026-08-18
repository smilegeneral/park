'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { SpaceChangeLog } from '@/lib/types'

// 兼容 Date / string 的日期格式化
function fmtDate(v: any, len = 10): string {
  if (!v) return ''
  const d = v instanceof Date ? v : new Date(v)
  if (isNaN(d.getTime())) return String(v).slice(0, len)
  return d.toISOString().slice(0, len)
}

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
    <div className="print-area slip-201" style={slipBox}>
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
    <div className="print-area slip-201" style={slipBox}>
      <h2 style={{
        textAlign: 'center', fontSize: 22, fontWeight: 700, margin: '0 0 4px',
        fontFamily: '"SimHei", "黑体", serif',
      }}>
        车位变更申请单
      </h2>
      <div style={{ textAlign: 'right', fontSize: 18, marginBottom: 12, marginRight: '2cm' }}>
        调换单号：{order.swap_order_no}
      </div>

      <table style={slipTable}>
        <colgroup>
          <col style={{ width: '20%' }} />
          <col style={{ width: 'calc(30% - 1cm)' }} />
          <col style={{ width: '25%' }} />
          <col style={{ width: 'calc(25% - 1cm)' }} />
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

// ===================== 车位变更申请单（基于变更日志真实字段） =====================
export function SwapApplySlip({ log }: { log: SpaceChangeLog }) {
  return (
    <div className="print-area slip-201" style={slipBox}>
      <h2 style={{
        textAlign: 'center', fontSize: 22, fontWeight: 700, margin: '0 0 4px',
        fontFamily: '"SimHei", "黑体", serif',
      }}>
        车位变更申请单
      </h2>
      <div style={{ textAlign: 'right', fontSize: 18, marginBottom: 12, marginRight: '2cm' }}>
        调换单号：{log.swap_order_no || ''}
      </div>

      <table style={slipTable}>
        <colgroup>
          <col style={{ width: '20%' }} />
          <col style={{ width: 'calc(30% - 1cm)' }} />
          <col style={{ width: '25%' }} />
          <col style={{ width: 'calc(25% - 1cm)' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={cellHead}>原车位号</td>
            <td style={cellVal}>{log.old_space_no}</td>
            <td style={cellHead}>楼栋-单元-房号</td>
            <td style={cellVal}>{log.old_house_key || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>原车位价格</td>
            <td style={cellVal}>{log.old_space_price != null ? `¥${Number(log.old_space_price).toFixed(0)}` : ''}</td>
            <td style={cellHead}>原车位类型</td>
            <td style={cellVal}>{log.old_space_type || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>业主姓名</td>
            <td style={cellVal}>{log.owner_name}</td>
            <td style={cellHead}>联系电话</td>
            <td style={cellVal}>{log.phone || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>变更后车位号</td>
            <td style={cellVal}>{log.new_space_no}</td>
            <td style={cellHead}>变更后车位类型</td>
            <td style={cellVal}>{log.new_space_type || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>变更后车位价格</td>
            <td style={cellVal}>{log.new_space_price != null ? `¥${Number(log.new_space_price).toFixed(0)}` : ''}</td>
            <td style={cellHead}>差价</td>
            <td style={cellVal}>{log.price_difference != null ? `¥${Number(log.price_difference).toFixed(0)}` : ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>原车位确认单号</td>
            <td style={cellVal}>{log.receipt_no || ''}</td>
            <td style={cellHead}>新车位确认单号</td>
            <td style={cellVal}>{log.new_receipt_no || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>变更原因</td>
            <td colSpan={3} style={{ ...cellVal, textAlign: 'left' }}>{log.change_reason || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>备注</td>
            <td colSpan={3} style={{ ...cellVal, textAlign: 'left' }}>{log.remarks || ''}</td>
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
            <td style={{ ...cellVal, textAlign: 'center' }}>{fmtDate(log.changed_at)}</td>
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

// ===================== 取消 / 新增车位单据（201mm × 123mm） =====================
export interface SpaceManageOrder {
  change_order_no: string
  space_id: string
  garage_zone?: string
  space_type?: string
  building_no?: string
  house_key?: string
  owner_name?: string
  price?: number | string
  remarks?: string
  reason?: string
  operator?: string
  apply_date: string
}

function SpaceManageSignRows() {
  return (
    <>
      <tr>
        <td colSpan={2} style={cellHead}>车位管理签字</td>
        <td colSpan={2} style={cellHead}>主管领导签字</td>
      </tr>
      <tr>
        <td colSpan={2} style={sigCell}>{''}</td>
        <td colSpan={2} style={sigCell}>{''}</td>
      </tr>
    </>
  )
}

// 取消车位单据
export function CancelSpaceSlip({ order }: { order: SpaceManageOrder }) {
  return (
    <div className="print-area slip-201" style={slipBox}>
      <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, margin: '0 0 4px', fontFamily: '"SimHei", "黑体", serif' }}>
        取消车位单据
      </h2>
      <div style={{ textAlign: 'right', fontSize: 14, marginBottom: 12 }}>
        变更单号：{order.change_order_no || ''}
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
            <td style={cellHead}>所属分区</td>
            <td style={cellVal}>{order.garage_zone || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>车位类型</td>
            <td style={cellVal}>{order.space_type || ''}</td>
            <td style={cellHead}>楼栋-单元-房号</td>
            <td style={cellVal}>{order.house_key || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>业主姓名</td>
            <td style={cellVal}>{order.owner_name || ''}</td>
            <td style={cellHead}>车位价格</td>
            <td style={cellVal}>{order.price != null ? `¥${Number(order.price).toFixed(0)}` : ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>取消原因</td>
            <td colSpan={3} style={{ ...cellVal, textAlign: 'left' }}>{order.reason || order.remarks || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>经办人</td>
            <td style={cellVal}>{order.operator || ''}</td>
            <td style={cellHead}>申请日期</td>
            <td style={cellVal}>{order.apply_date}</td>
          </tr>
          <SpaceManageSignRows />
        </tbody>
      </table>
    </div>
  )
}

// 新增车位单据
export function AddSpaceSlip({ order }: { order: SpaceManageOrder }) {
  return (
    <div className="print-area slip-201" style={slipBox}>
      <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, margin: '0 0 4px', fontFamily: '"SimHei", "黑体", serif' }}>
        新增车位单据
      </h2>
      <div style={{ textAlign: 'right', fontSize: 14, marginBottom: 12 }}>
        变更单号：{order.change_order_no || ''}
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
            <td style={cellHead}>所属分区</td>
            <td style={cellVal}>{order.garage_zone || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>车位类型</td>
            <td style={cellVal}>{order.space_type || ''}</td>
            <td style={cellHead}>楼栋-单元-房号</td>
            <td style={cellVal}>{order.house_key || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>车位价格</td>
            <td style={cellVal}>{order.price != null ? `¥${Number(order.price).toFixed(0)}` : ''}</td>
            <td style={cellHead}>业主姓名</td>
            <td style={cellVal}>{order.owner_name || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>备注</td>
            <td colSpan={3} style={{ ...cellVal, textAlign: 'left' }}>{order.remarks || ''}</td>
          </tr>
          <tr>
            <td style={cellHead}>经办人</td>
            <td style={cellVal}>{order.operator || ''}</td>
            <td style={cellHead}>申请日期</td>
            <td style={cellVal}>{order.apply_date}</td>
          </tr>
          <SpaceManageSignRows />
        </tbody>
      </table>
    </div>
  )
}

// ===================== 车位牌（A4 横向） =====================
// 三行：未售车位 / 可临时停放 / 车位号：{{old_space_no}}（右对齐，字号小）
export function SpacePlate({ spaceNo }: { spaceNo: string }) {
  return (
    <div className="print-area plate-a4">
      <div className="plate-inner" style={{
        height: '100%', width: '100%',
        fontFamily: '"SimHei", "黑体", serif', fontWeight: 700,
        padding: '0 40px',
      }}>
        <div style={{ textAlign: 'center', fontSize: 190, lineHeight: 1.05, color: '#000' }}>
          未售车位
        </div>
        <div style={{ textAlign: 'center', fontSize: 190, lineHeight: 1.05, color: '#000', marginTop: 10 }}>
          可临时停放
        </div>
        <div style={{ textAlign: 'right', fontSize: 72, color: '#000', marginTop: 26, paddingRight: 12 }}>
          车位号：{spaceNo}
        </div>
      </div>
    </div>
  )
}

// ===================== 业务单据预览打印面板 =====================
// 支持：销售单、调换单、车位变更申请单（基于变更日志）、车位牌
export default function DocPrintPanel({
  saleOrder,
  swapOrder,
  changeLog,
  initialDoc = 'apply',
}: {
  saleOrder?: SaleOrder | null
  swapOrder?: SwapOrder | null
  changeLog?: SpaceChangeLog | null
  initialDoc?: 'sale' | 'swap' | 'apply' | 'plate'
}) {
  const hasSale = !!saleOrder
  const hasSwap = !!swapOrder
  const hasChange = !!changeLog
  const [docType, setDocType] = useState<'sale' | 'swap' | 'apply' | 'plate'>(
    (hasChange && (initialDoc === 'apply' || initialDoc === 'plate'))
      ? initialDoc
      : hasSale ? 'sale' : 'swap'
  )
  const [mounted, setMounted] = useState(false)
  const [printing, setPrinting] = useState(false)
  useEffect(() => setMounted(true), [])

  // 无可用单据
  if (!hasSale && !hasSwap && !hasChange) return null

  const showSale = hasSale && (docType === 'sale')
  const showSwap = hasSwap && (docType === 'swap')
  const showApply = hasChange && (docType === 'apply')
  const showPlate = hasChange && (docType === 'plate')

  function handlePrint() {
    setPrinting(true)
  }

  // 渲染到 print-only 后触发打印，确保单据已挂载到 DOM
  useEffect(() => {
    if (printing && mounted) {
      window.print()
      setPrinting(false)
    }
  }, [printing, mounted])

  // 待打印的单据（逃逸到 body 的 .print-only，避免被祖先 display:none 隐藏）
  const printable =
    showSale && saleOrder ? <SaleSlip order={saleOrder} />
      : showSwap && swapOrder ? <SwapSlip order={swapOrder} />
        : showApply && changeLog ? <SwapApplySlip log={changeLog} />
          : showPlate && changeLog ? <SpacePlate spaceNo={changeLog.old_space_no} />
            : null

  return (
    <div className="print-wrap" style={{ marginTop: 18 }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: '#555' }}>
          业务单据：
          <select
            className="select"
            value={docType}
            onChange={e => setDocType(e.target.value as any)}
            style={{ marginLeft: 6 }}
          >
            {hasSale && <option value="sale">车位销售单</option>}
            {hasSwap && <option value="swap">车位调换单</option>}
            {hasChange && <option value="apply">车位变更申请单</option>}
            {hasChange && <option value="plate">车位牌</option>}
          </select>
        </label>
        <button type="button" className="btn-primary" onClick={handlePrint} style={{ fontSize: 14 }}>
          🖨️ 预览打印
        </button>
      </div>

      {showSale && saleOrder && <SaleSlip order={saleOrder} />}
      {showSwap && swapOrder && <SwapSlip order={swapOrder} />}
      {showApply && changeLog && <SwapApplySlip log={changeLog} />}
      {showPlate && changeLog && <SpacePlate spaceNo={changeLog.old_space_no} />}

      {mounted && printing && printable && createPortal(
        <div className="print-only">{printable}</div>,
        document.body
      )}
    </div>
  )
}
