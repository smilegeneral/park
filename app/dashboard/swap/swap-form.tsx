'use client'
import { useState, useTransition } from 'react'
import { swapSpace, getOwnerSpaces, getOldConfirmNo } from '@/lib/actions'
import type { ParkingSpace } from '@/lib/types'
import DocPrintPanel, { type SwapOrder } from '@/app/dashboard/components/doc-print'

// ============================================================
//  车位调换表单（新输入顺序）
//  1. 输入房号 → 自动带出业主姓名、电话
//  2. 名下旧车位（已售/已核销）下拉选择
//  3. 选中旧车位 → 带出车位类型、旧价格、旧车位确认单号（无则可手填）
//  4. 新车位号输入 → 带出车位类型
//  5. 差价 / 调换类型 / 变更原因 / 备注 等正常输入
// ============================================================

export default function SwapForm({ availableSpaces }: { availableSpaces: ParkingSpace[] }) {
  // 步骤1：房号 → 业主
  const [houseKey, setHouseKey] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [ownerMsg, setOwnerMsg] = useState('')

  // 步骤2：名下旧车位
  const [oldSpaces, setOldSpaces] = useState<ParkingSpace[]>([])
  const [oldSpaceId, setOldSpaceId] = useState('')
  const [oldSpaceType, setOldSpaceType] = useState('')
  const [oldSpacePrice, setOldSpacePrice] = useState('')
  const [receiptNo, setReceiptNo] = useState('')
  const [newReceiptNo, setNewReceiptNo] = useState('')

  // 步骤4：新车位
  const [newSpaceId, setNewSpaceId] = useState('')
  const [newSpaceType, setNewSpaceType] = useState('')
  const [newSpacePrice, setNewSpacePrice] = useState('')

  // 其他
  const [diff, setDiff] = useState('0')
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [order, setOrder] = useState<SwapOrder | null>(null)

  // 步骤1：输入房号带出业主 + 名下旧车位
  async function handleHouseKeyChange(v: string) {
    setHouseKey(v)
    setOwnerName(''); setPhone(''); setOldSpaces([]); setOldSpaceId('')
    setOldSpaceType(''); setOldSpacePrice(''); setReceiptNo(''); setNewReceiptNo(''); setOwnerMsg('')
    const key = v.trim()
    if (!key) return
    // 查询业主档案（带出姓名/电话）
    try {
      const res = await fetch(`/api/owner?house_key=${encodeURIComponent(key)}`)
      const data = await res.json()
      if (data?.ok && data.found) {
        setOwnerName(data.owner.owner_name || '')
        setPhone(data.owner.phone || '')
      }
    } catch { /* 忽略 */ }
    // 查询名下旧车位
    startTransition(async () => {
      const r = await getOwnerSpaces(key)
      if (r.ok && r.spaces) {
        setOldSpaces(r.spaces)
        if (r.spaces.length === 0) setOwnerMsg('该房号名下暂无已售/已核销车位')
      }
    })
  }

  // 步骤2：选择旧车位 → 带出类型/价格/确认单号
  async function handleOldSpaceChange(id: string) {
    setOldSpaceId(id)
    const sp = oldSpaces.find(s => s.space_id === id)
    if (sp) {
      setOldSpaceType(sp.space_type || '')
      setOldSpacePrice(sp.price != null ? String(sp.price) : '')
      // 查旧确认单号（查不到则留空，可手填）
      const r = await getOldConfirmNo(id)
      setReceiptNo(r.ok && r.receipt_no ? r.receipt_no : '')
    } else {
      setOldSpaceType(''); setOldSpacePrice(''); setReceiptNo(''); setNewReceiptNo('')
    }
  }

  // 步骤4：新车位号输入 → 带出类型/价格（无则可手填）
  function handleNewSpaceChange(id: string) {
    setNewSpaceId(id)
    const sp = availableSpaces.find(s => s.space_id === id)
    setNewSpaceType(sp ? (sp.space_type || '') : '')
    setNewSpacePrice(sp && sp.price != null ? String(sp.price) : '')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!houseKey.trim()) return setMsg({ type: 'err', text: '请输入房号' })
    if (!oldSpaceId) return setMsg({ type: 'err', text: '请选择名下旧车位' })
    if (!newSpaceId.trim()) return setMsg({ type: 'err', text: '请输入新车位号' })
    if (!ownerName) return setMsg({ type: 'err', text: '请输入业主姓名' })

    startTransition(async () => {
      try {
        const res = await swapSpace({
          old_space_id: oldSpaceId,
          new_space_id: newSpaceId.trim(),
          owner_name: ownerName,
          phone,
          house_key: houseKey.trim(),
          price_difference: parseFloat(diff) || 0,
          swap_type: (parseFloat(diff) || 0) !== 0 ? '加钱换车位' : '平换车位',
          change_reason: reason,
          receipt_no: receiptNo,
          new_receipt_no: newReceiptNo,
          new_space_price: newSpacePrice,
          remarks,
          operator: '当前用户',
        })
        if (!res || (res as any).ok === false) {
          return setMsg({ type: 'err', text: `❌ ${(res as any).error || '调换失败，请重试'}` })
        }
        setOrder({
          swap_order_no: res.swap_order_no,
          owner_name: ownerName,
          phone,
          house_key: houseKey.trim(),
          old_space_id: oldSpaceId,
          old_space_type: oldSpaceType,
          old_space_price: oldSpacePrice,
          price_difference: parseFloat(diff) || 0,
          new_space_id: newSpaceId.trim(),
          new_space_type: newSpaceType,
          new_space_price: newSpacePrice,
          change_reason: reason,
          receipt_no: receiptNo,
          new_receipt_no: newReceiptNo,
          remarks,
          apply_date: new Date().toISOString().slice(0, 10),
        })
        setMsg({ type: 'ok', text: `✅ 调换成功！单号：${res.swap_order_no}` })
        setOldSpaceId(''); setNewSpaceId(''); setDiff('0')
        setReason(''); setReceiptNo(''); setNewReceiptNo(''); setRemarks('')
        setNewSpaceType(''); setNewSpacePrice('')
      } catch (e: any) {
        setMsg({ type: 'err', text: `❌ ${e?.message || '系统错误'}` })
      }
    })
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="no-print">
        {/* 步骤1：房号带业主 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <Field label="房号（房屋编号）*">
            <input
              className="input"
              value={houseKey}
              onChange={e => handleHouseKeyChange(e.target.value)}
              placeholder="如 26-2-102"
            />
          </Field>
          <Field label="业主姓名 *">
            <input className="input" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
          </Field>
          <Field label="联系电话">
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />
          </Field>
        </div>
        {ownerMsg && <div className="text-sm text-gray" style={{ marginTop: 6 }}>{ownerMsg}</div>}

        {/* 步骤2：名下旧车位 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
          <Field label="名下旧车位 *">
            <select className="select" value={oldSpaceId} onChange={e => handleOldSpaceChange(e.target.value)}>
              <option value="">-- {houseKey ? '选择旧车位' : '请先输入房号'} --</option>
              {oldSpaces.map(s => (
                <option key={s.space_id} value={s.space_id}>
                  {s.space_id} ({s.space_type})
                </option>
              ))}
            </select>
          </Field>
          <Field label="旧车位类型（自动带出）">
            <input className="input" value={oldSpaceType} readOnly placeholder="自动" />
          </Field>
          <Field label="旧车位价格（自动带出）">
            <input className="input" value={oldSpacePrice} readOnly placeholder="自动" />
          </Field>
        </div>

        {/* 步骤3：旧车位确认单号（自动带出，可改） */}
        <div style={{ marginTop: 10 }}>
          <Field label="旧车位确认单号（自动带出，无则可手填）">
            <input className="input" value={receiptNo} onChange={e => setReceiptNo(e.target.value)} placeholder="如 0001394" />
          </Field>
        </div>

        {/* 步骤4：新车位 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <Field label="新车位号 *（可输入或从下拉选）">
            <input
              className="input"
              value={newSpaceId}
              onChange={e => handleNewSpaceChange(e.target.value)}
              list="available-spaces"
              placeholder="如 A-201"
            />
            <datalist id="available-spaces">
              {availableSpaces.map(s => (
                <option key={s.space_id} value={s.space_id}>{s.space_type}</option>
              ))}
            </datalist>
          </Field>
          <Field label="新车位类型（自动带出）">
            <input className="input" value={newSpaceType} readOnly placeholder="自动" />
          </Field>
        </div>

        {/* 步骤4：新车位确认单号 */}
        <div style={{ marginTop: 10 }}>
          <Field label="新车位确认单号">
            <input className="input" value={newReceiptNo} onChange={e => setNewReceiptNo(e.target.value)} placeholder="如 0001395" />
          </Field>
        </div>

        {/* 新车位价格 */}
        <div style={{ marginTop: 10 }}>
          <Field label="新车位价格">
            <input className="input" value={newSpacePrice} onChange={e => setNewSpacePrice(e.target.value)} placeholder="单位：元" />
          </Field>
        </div>

        {/* 其他输入 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <Field label="调换类型（按差价自动判定）">
            <input
              className="input"
              value={(parseFloat(diff) || 0) !== 0 ? '加钱换车位' : '平换车位'}
              readOnly
            />
          </Field>
          <Field label="差价（元）">
            <input className="input" type="number" value={diff} onChange={e => setDiff(e.target.value)} />
          </Field>
        </div>

        <Field label="变更原因">
          <textarea
            className="input"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            style={{ width: '100%', resize: 'vertical' }}
            placeholder="如：原车位无法安装充电桩"
          />
        </Field>

        <Field label="备注">
          <input className="input" value={remarks} onChange={e => setRemarks(e.target.value)} />
        </Field>

        {msg && (
          <div className={msg.type === 'ok' ? 'text-green' : 'text-red'} style={{ marginTop: 8, fontSize: 13, fontWeight: 500 }}>
            {msg.text}
          </div>
        )}

        <button type="submit" className="btn-primary mt-4" disabled={pending} style={{ fontSize: 14 }}>
          {pending ? '处理中...' : '🔄 确认调换并生成调换单'}
        </button>
      </form>

      {order && <DocPrintPanel swapOrder={order} />}
    </div>
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
