'use client'
import { useState, useEffect, useTransition } from 'react'
import { confirmRetailSale } from '@/lib/actions'
import type { ParkingSpace } from '@/lib/types'
import DocPrintPanel, { type SaleOrder } from '@/app/dashboard/components/doc-print'

// ============================================================
//  零售销售表单 - 录入业主信息并确认销售
//  先输入房屋编号 → 自动带出业主姓名和电话（可修改）
//  预订车位优先用预订人信息预填
// ============================================================

export default function SaleForm({ space, initialHouseKey = '' }: { space: ParkingSpace; initialHouseKey?: string }) {
  // 预订车位优先用预订人预填；否则留空
  const initialName = space.booker_name || ''
  const initialPhone = space.booker_phone || ''
  const [ownerName, setOwnerName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [price, setPrice] = useState(String(space.price || ''))
  const [houseKey, setHouseKey] = useState(initialHouseKey)
  const [receiptNo, setReceiptNo] = useState('')
  const [confirmNo, setConfirmNo] = useState('')
  const [saleOrderNo, setSaleOrderNo] = useState('')
  const [remarks, setRemarks] = useState('')
  const [matched, setMatched] = useState<{ owner_name: string; phone: string; phone2?: string } | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [saleOrder, setSaleOrder] = useState<SaleOrder | null>(null)

  // 组件挂载后：预填下一个销售单号 + 若有预填房号（预订车位）自动带出业主档案
  useEffect(() => {
    fetch('/api/next-sale-order')
      .then(r => r.json())
      .then(d => { if (d?.ok && d.sale_order_no) setSaleOrderNo(d.sale_order_no) })
      .catch(() => {})
    if (initialHouseKey.trim()) {
      handleHouseKeyChange(initialHouseKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 输入房屋编号 → 自动带出业主姓名/电话
  async function handleHouseKeyChange(v: string) {
    setHouseKey(v)
    setMsg(null)
    const key = v.trim()
    if (!key) {
      setMatched(null)
      return
    }
    try {
      const res = await fetch(`/api/owner?house_key=${encodeURIComponent(key)}`)
      const data = await res.json()
      if (data?.ok && data.found) {
        setMatched({ owner_name: data.owner.owner_name, phone: data.owner.phone, phone2: data.owner.phone2 })
        setOwnerName(data.owner.owner_name || initialName)
        setPhone(data.owner.phone || initialPhone)
      } else {
        setMatched(null)
        // 未找到业主档案时，保留预订人信息
        setOwnerName(initialName)
        setPhone(initialPhone)
      }
    } catch {
      setMatched(null)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)

    if (!saleOrderNo.trim()) return setMsg({ type: 'err', text: '请输入车位销售单号' })
    if (!ownerName.trim()) return setMsg({ type: 'err', text: '请输入业主姓名' })
    if (!phone.trim()) return setMsg({ type: 'err', text: '请输入联系电话' })
    if (!houseKey.trim()) return setMsg({ type: 'err', text: '请输入房屋编号（如 1-1-101）' })
    if (!receiptNo.trim()) return setMsg({ type: 'err', text: '请输入收据编号' })
    if (!confirmNo.trim()) return setMsg({ type: 'err', text: '请输入确认书编号' })

    startTransition(async () => {
      try {
        const res = await confirmRetailSale({
          space_id: space.space_id,
          sale_order_no: saleOrderNo.trim(),
          owner_name: ownerName.trim(),
          phone: phone.trim(),
          price: parseFloat(price) || 0,
          house_key: houseKey.trim(),
          receipt_no: receiptNo.trim(),
          confirm_no: confirmNo.trim(),
          remarks: remarks.trim(),
        }, '当前用户')

        setMsg({ type: 'ok', text: `✅ 销售确认成功！凭证号：${res.sale_order_no}` })
        // 保存销售单用于预览打印（不清空表单，便于核对与打印）
        setSaleOrder({
          sale_order_no: res.sale_order_no,
          space_id: res.space_id,
          space_type: res.space_type,
          owner_name: res.owner_name,
          phone: res.phone,
          house_key: res.house_key,
          amount: res.amount,
          receipt_no: res.receipt_no,
          confirm_no: res.confirm_no,
          remarks: res.remarks,
          sale_time: res.sale_time,
        })
        setOwnerName(''); setPhone(''); setHouseKey(''); setMatched(null)
        setReceiptNo(''); setConfirmNo(''); setSaleOrderNo(''); setRemarks(''); setPrice(String(space.price || ''))
      } catch (e: any) {
        setMsg({ type: 'err', text: `❌ ${e.message}` })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="no-print" style={{ marginTop: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="车位销售单号（自动生成，可修改）">
          <input
            className="input"
            value={saleOrderNo}
            onChange={e => setSaleOrderNo(e.target.value)}
            onBlur={() => {
              const v = saleOrderNo.trim()
              if (!v) return
              fetch(`/api/check-sale-order?no=${encodeURIComponent(v)}`)
                .then(r => r.json())
                .then(d => {
                  if (d?.ok && d.exists) {
                    setMsg({ type: 'err', text: `❌ 销售单号 ${v} 已存在，请更换编号` })
                  } else if (msg?.type === 'err' && msg.text.includes('已存在')) {
                    setMsg(null)
                  }
                })
                .catch(() => {})
            }}
            placeholder="如 S074"
          />
        </Field>
        <Field label="车位类型（自动带出）">
          <input className="input" value={space.space_type || ''} readOnly placeholder="自动" />
        </Field>
        <Field label="房屋编号（房号，先输入自动带出业主）">
          <input
            className="input"
            value={houseKey}
            onChange={e => handleHouseKeyChange(e.target.value)}
            placeholder="如 1-1-101"
          />
        </Field>
        <Field label="销售价格">
          <input className="input" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="金额" />
        </Field>
        <Field label="业主姓名">
          <input
            className="input"
            value={ownerName}
            onChange={e => { setOwnerName(e.target.value); setMsg(null) }}
            placeholder="如：张三"
            style={{ fontWeight: matched ? 600 : 400 }}
          />
        </Field>
        <Field label="联系电话">
          <input
            className="input"
            value={phone}
            onChange={e => { setPhone(e.target.value); setMsg(null) }}
            placeholder="手机号"
          />
        </Field>
        <Field label="收据编号">
          <input className="input" value={receiptNo} onChange={e => setReceiptNo(e.target.value)} placeholder="收据号" />
        </Field>
        <Field label="确认书编号">
          <input className="input" value={confirmNo} onChange={e => setConfirmNo(e.target.value)} placeholder="确认书号" />
        </Field>
        <Field label="备注">
          <input className="input" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="选填，如团购/特殊说明" />
        </Field>
      </div>

      {matched && (
        <div style={{
          marginTop: 8, padding: '6px 10px', fontSize: 12, color: '#1677ff',
          background: '#e6f7ff', borderRadius: 4, border: '1px solid #91d5ff',
        }}>
          已带出业主档案：{matched.owner_name} · {matched.phone}
          {matched.phone2 ? ` · 二电话 ${matched.phone2}` : ''}
          （可修改后提交）
        </div>
      )}

      {msg && (
        <div className={msg.type === 'ok' ? 'text-green' : 'text-red'} style={{ marginTop: 8, fontSize: 13, fontWeight: 500 }}>
          {msg.text}
        </div>
      )}

      <div className="flex" style={{ marginTop: 10, gap: 8 }}>
        <button type="submit" className="btn-success" disabled={pending} style={{ fontSize: 13 }}>
          {pending ? '处理中...' : '✅ 确认销售并生成凭证'}
        </button>
      </div>

      {saleOrder && <DocPrintPanel saleOrder={saleOrder} />}
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 12, color: '#555', display: 'block' }}>
      {label}
      <div style={{ marginTop: 2 }}>{children}</div>
    </label>
  )
}
