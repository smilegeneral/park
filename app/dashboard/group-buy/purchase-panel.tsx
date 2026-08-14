'use client'
import { useState, useTransition } from 'react'
import { createGroupBuyPurchase } from '@/lib/actions'

// ============================================================
//  团购公司购买登记面板
//  录入：公司名称 / 所属部门 / 联系人 / 联系电话 /
//       购买车位数量 / 车位号 / 金额 / 是否付款 / 发票类型
//  提交后联动锁定车位 + 写入 group_buy_purchase 记录
// ============================================================

const INVOICE_TYPES = ['未开票', '专票', '普票', '普票个人']

export default function PurchasePanel({ company }: { company: any }) {
  const [open, setOpen] = useState(false)
  const [companyName, setCompanyName] = useState(company?.company_name || '')
  const [department, setDepartment] = useState(company?.department || '')
  const [contactPerson, setContactPerson] = useState(company?.contact_person || '')
  const [contactPhone, setContactPhone] = useState(company?.phone || '')
  const [spaceInput, setSpaceInput] = useState('')
  const [amount, setAmount] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [invoiceType, setInvoiceType] = useState(company?.invoice_type || '未开票')
  const [remarks, setRemarks] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const ids = spaceInput.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean)
    if (!companyName) return setMsg({ type: 'err', text: '请输入团购公司名称' })
    if (ids.length === 0) return setMsg({ type: 'err', text: '请输入购买的车位编号' })
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return setMsg({ type: 'err', text: '请输入有效金额' })

    startTransition(async () => {
      try {
        const res = await createGroupBuyPurchase({
          company_name: companyName,
          department,
          contact_person: contactPerson,
          contact_phone: contactPhone,
          space_ids: ids,
          amount: amt,
          is_paid: isPaid,
          invoice_type: invoiceType,
          remarks,
          operator: '当前用户',
        })
        setMsg({ type: 'ok', text: `✅ 登记成功，锁定 ${res.locked_count} 个车位（购买单 #${res.purchase_id}）` })
        setSpaceInput(''); setAmount(''); setRemarks('')
        setTimeout(() => location.reload(), 1200)
      } catch (e: any) {
        setMsg({ type: 'err', text: `❌ ${e.message}` })
      }
    })
  }

  return (
    <div style={{ marginTop: 10 }}>
      {!open ? (
        <button type="button" className="btn-primary" style={{ fontSize: 13 }} onClick={() => setOpen(true)}>
          ➕ 公司购买登记
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ border: '1px solid #e6f0ff', borderRadius: 6, padding: 12, background: '#fafcff' }}>
          <div className="text-sm" style={{ fontWeight: 600, marginBottom: 8 }}>团购公司购买登记</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="团购公司名称 *">
              <input className="input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="如：XX公司" />
            </Field>
            <Field label="所属部门">
              <input className="input" value={department} onChange={e => setDepartment(e.target.value)} placeholder="如：行政部" />
            </Field>
            <Field label="联系人">
              <input className="input" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
            </Field>
            <Field label="联系电话">
              <input className="input" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
            </Field>
            <Field label={`购买车位数量（已填 ${spaceInput.split(/[,，\s]+/).filter(Boolean).length} 个）`}>
              <input className="input" value={spaceInput} onChange={e => setSpaceInput(e.target.value)}
                placeholder="车位号，逗号/空格分隔：A-001, A-002" />
            </Field>
            <Field label="金额（元）*">
              <input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
            </Field>
            <Field label="发票类型">
              <select className="select" value={invoiceType} onChange={e => setInvoiceType(e.target.value)}>
                {INVOICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="是否付款">
              <label className="flex" style={{ alignItems: 'center', gap: 6, fontSize: 13, paddingTop: 6 }}>
                <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
                {isPaid ? '已付款' : '未付款'}
              </label>
            </Field>
            <Field label="备注">
              <input className="input" value={remarks} onChange={e => setRemarks(e.target.value)} />
            </Field>
          </div>
          {msg && (
            <div className={msg.type === 'ok' ? 'text-green' : 'text-red'} style={{ marginTop: 8, fontSize: 13, fontWeight: 500 }}>
              {msg.text}
            </div>
          )}
          <div className="flex mt-3" style={{ gap: 8 }}>
            <button type="submit" className="btn-success" disabled={pending} style={{ fontSize: 13 }}>
              {pending ? '处理中...' : '💾 提交购买登记'}
            </button>
            <button type="button" className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setOpen(false)}>
              取消
            </button>
          </div>
        </form>
      )}
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