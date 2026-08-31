'use client'

import { useState } from 'react'
import { createGroupBuyPurchase } from '@/lib/actions'
import type { ParkingSpace } from '@/lib/types'
import { GROUP_BUY_DEPARTMENTS } from '@/lib/types'

// ============================================================
//  团购公司购买登记
//  - 一个按钮进入登记界面
//  - 选择已有团购公司 / 新建团购公司（输入名称）
//  - 部门（下拉，可选填）、联系人、电话
//  - 车位数量、车位号列表（多选）、金额、发票类型、是否付款、备注
//  提交后：写入购买记录 + 车位台账 从未售 → 团购锁定
// ============================================================

const INVOICE_TYPES = ['专票', '普票', '普票个人', '未开票']

export default function PurchasePanel({
  companies,
  unsold,
  company, // 若由某团购公司卡片内嵌调用，预选该公司
}: {
  companies: any[]
  unsold: ParkingSpace[]
  company?: any
}) {
  const [open, setOpen] = useState(false)
  const [companyId, setCompanyId] = useState<string>(company ? String(company.company_id) : '')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [department, setDepartment] = useState(company?.department || '')
  const [contact, setContact] = useState(company?.contact_person || '')
  const [phone, setPhone] = useState(company?.phone || '')
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>([])
  const [amount, setAmount] = useState('')
  const [invoiceType, setInvoiceType] = useState('专票')
  const [isPaid, setIsPaid] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  // 部门选项：从已登记记录中聚合（去重）
  const deptOptions = Array.from(
    new Set(
      companies
        .map((c) => c.department)
        .filter((d) => d && d.trim())
    )
  ) as string[]

  function reset() {
    setCompanyId(company ? String(company.company_id) : '')
    setNewCompanyName('')
    setSelectedSpaces([])
    setAmount('')
    setIsPaid(false)
    setRemarks('')
    setMsg(null)
  }

  function toggleSpace(sid: string) {
    setSelectedSpaces((prev) =>
      prev.includes(sid) ? prev.filter((s) => s !== sid) : [...prev, sid]
    )
  }

  async function submit() {
    setMsg(null)
    const isNew = companyId === '__new__'
    const finalCompanyName = isNew ? newCompanyName.trim() : companies.find((c) => String(c.company_id) === companyId)?.company_name
    if (!finalCompanyName) {
      setMsg({ type: 'err', text: '请选择团购公司或输入新公司名称' })
      return
    }
    if (!department.trim()) {
      setMsg({ type: 'err', text: '请填写部门（可下拉选择或直接输入）' })
      return
    }
    if (selectedSpaces.length === 0) {
      setMsg({ type: 'err', text: '请至少选择一个车位' })
      return
    }
    if (!amount || Number(amount) <= 0) {
      setMsg({ type: 'err', text: '请输入有效金额' })
      return
    }
    setSaving(true)
    try {
      const res: any = await createGroupBuyPurchase({
        company_name: finalCompanyName,
        department: department.trim(),
        contact_person: contact.trim(),
        contact_phone: phone.trim(),
        space_ids: selectedSpaces,
        amount: Number(amount),
        is_paid: isPaid,
        invoice_type: invoiceType,
        remarks: remarks.trim(),
        operator: 'admin',
      })
      if (res && res.ok === false) {
        setMsg({ type: 'err', text: res.error || '登记失败' })
        return
      }
      setMsg({ type: 'ok', text: `登记成功，已锁定 ${selectedSpaces.length} 个车位` })
      setTimeout(() => {
        setOpen(false)
        reset()
        window.location.reload()
      }, 900)
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message || '登记失败' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        + 公司购买登记
      </button>

      {open && (
        <div className="drawer-mask" onClick={() => setOpen(false)}>
          <div className="drawer-panel" style={{ maxWidth: 760, width: '96%' }} onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <span style={{ fontSize: 16, fontWeight: 700 }}>团购公司购买登记</span>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="drawer-body" style={{ maxHeight: '74vh', overflowY: 'auto' }}>
              <div style={formGrid}>
                <label className="text-sm" style={lbl}>团购公司</label>
                <select
                  value={companyId}
                  onChange={(e) => {
                    const v = e.target.value
                    setCompanyId(v)
                    if (v !== '__new__') {
                      const c = companies.find((x) => String(x.company_id) === v)
                      if (c) {
                        setDepartment(c.department || '')
                        setContact(c.contact_person || '')
                        setPhone(c.phone || '')
                      }
                    } else {
                      setDepartment(''); setContact(''); setPhone('')
                    }
                  }}
                  style={sel}
                >
                  <option value="">— 选择已有团购公司 —</option>
                  {companies.map((c) => (
                    <option key={c.company_id} value={String(c.company_id)}>{c.company_name}</option>
                  ))}
                  <option value="__new__">＋ 新建团购公司…</option>
                </select>

                {companyId === '__new__' && (
                  <>
                    <label className="text-sm" style={lbl}>新公司名称</label>
                    <input
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="请输入团购公司全称"
                      style={inp}
                    />
                  </>
                )}

                <label className="text-sm" style={lbl}>部门 *</label>
                {/* 既可下拉选择常用部门，也可直接手工输入 */}
                <input
                  list="department-options"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="可下拉选择或直接输入"
                  style={inp}
                />
                <datalist id="department-options">
                  {[...new Set([...GROUP_BUY_DEPARTMENTS, ...deptOptions])].map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>

                <label className="text-sm" style={lbl}>联系人</label>
                <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="联系人姓名" style={inp} />

                <label className="text-sm" style={lbl}>联系电话</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="联系电话" style={inp} />

                <label className="text-sm" style={lbl}>车位数量（自动统计）</label>
                <input value={selectedSpaces.length} readOnly style={{ ...inp, background: '#f5f5f5' }} />

                <label className="text-sm" style={lbl}>金额（元）</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="总金额"
                  style={inp}
                  inputMode="decimal"
                />

                <label className="text-sm" style={lbl}>发票类型</label>
                <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)} style={sel}>
                  {INVOICE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                <label className="text-sm" style={lbl}>是否付款</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                  <span className="text-sm">已付款</span>
                </label>

                <label className="text-sm" style={{ gridColumn: '1 / -1' }}>备注</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="备注信息（可选）"
                  rows={2}
                  style={{ ...inp, gridColumn: '1 / -1' }}
                />
              </div>

              <div className="text-sm text-gray" style={{ marginTop: 12 }}>
                选择车位号（可多选，当前共 {selectedSpaces.length} 个）：
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, maxHeight: 220, overflowY: 'auto' }}>
                {unsold.length === 0 && <span className="text-gray text-sm">暂无可购未售车位</span>}
                {unsold.map((s) => {
                  const on = selectedSpaces.includes(s.space_id)
                  return (
                    <button
                      key={s.space_id}
                      onClick={() => toggleSpace(s.space_id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 4,
                        border: `1px solid ${on ? '#1677ff' : '#d9d9d9'}`,
                        background: on ? '#1677ff' : '#fff',
                        color: on ? '#fff' : '#333',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {s.space_id}
                    </button>
                  )
                })}
              </div>
              {selectedSpaces.length > 0 && (
                <div className="text-xs text-gray" style={{ marginTop: 6 }}>
                  已选：{selectedSpaces.join('、')}
                </div>
              )}
            </div>

            <div className="drawer-foot">
              {msg && (
                <span style={{ color: msg.type === 'ok' ? '#52c41a' : '#ff4d4f', fontSize: 13 }}>
                  {msg.text}
                </span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={saving}>取消</button>
                <button className="btn btn-primary" onClick={submit} disabled={saving}>
                  {saving ? '提交中…' : '提交登记'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const formGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '120px 1fr',
  gap: '10px 12px',
  alignItems: 'center',
}
const lbl: React.CSSProperties = { color: '#555' }
const inp: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #d9d9d9',
  fontSize: 13,
}
const sel: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #d9d9d9',
  fontSize: 13,
  background: '#fff',
}
