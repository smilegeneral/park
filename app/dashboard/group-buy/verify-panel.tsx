'use client'

import { useState, useEffect } from 'react'
import { verifyGroupBuy } from '@/lib/actions'

// ============================================================
//  团购核销（公司 → 业主）
//  1. 先选团购公司
//  2. 选该公司名下的「团购锁定」车位
//  3. 填业主信息 + 销售金额 + 车位确认单号
//  提交后：车位台账 → 已售（记录销售金额、确认单号），团购核销明细表增加记录
// ============================================================

export default function VerifyPanel({
  lockedSpaces,
  companies,
}: {
  lockedSpaces: any[]
  companies: any[]
}) {
  const [companyId, setCompanyId] = useState('')
  const [companySpaces, setCompanySpaces] = useState<any[]>([])
  const [spaceId, setSpaceId] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [houseKey, setHouseKey] = useState('')
  const [saleAmount, setSaleAmount] = useState('')
  const [receiptNo, setReceiptNo] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  async function onCompanyChange(v: string) {
    setCompanyId(v)
    setSpaceId('')
    setCompanySpaces([])
    if (!v) return
    const c = companies.find((x) => String(x.company_id) === v)
    if (!c) return
    const res = await fetch(`/api/group-buy/spaces?company=${encodeURIComponent(c.company_name)}`)
    const data = await res.json()
    const spaces = (data.spaces || []) as any[]
    setCompanySpaces(spaces.filter((s: any) => s.status === '团购锁定'))
  }

  // 切换车位时自动带入建议确认单号（车位号-编号），可改
  useEffect(() => {
    if (spaceId && !receiptNo) setReceiptNo(spaceId)
  }, [spaceId])

  async function submit() {
    setMsg(null)
    if (!companyId) { setMsg({ type: 'err', text: '请选择团购公司' }); return }
    if (!spaceId) { setMsg({ type: 'err', text: '请选择车位' }); return }
    if (!ownerName.trim()) { setMsg({ type: 'err', text: '请填写业主姓名' }); return }
    if (!houseKey.trim()) { setMsg({ type: 'err', text: '请填写房号' }); return }
    if (!saleAmount || Number(saleAmount) <= 0) { setMsg({ type: 'err', text: '请填写有效销售金额' }); return }
    setSaving(true)
    try {
      await verifyGroupBuy({
        company_id: Number(companyId),
        space_id: spaceId,
        owner_name: ownerName.trim(),
        owner_phone: ownerPhone.trim(),
        house_key: houseKey.trim(),
        sale_amount: Number(saleAmount),
        receipt_no: receiptNo.trim(),
        operator: 'admin',
      })
      setMsg({ type: 'ok', text: `核销成功：${spaceId} → ${ownerName}` })
      setTimeout(() => window.location.reload(), 900)
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message || '核销失败' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="text-sm" style={{ display: 'block', marginBottom: 4 }}>团购公司</label>
          <select value={companyId} onChange={(e) => onCompanyChange(e.target.value)} style={sel}>
            <option value="">— 选择团购公司 —</option>
            {companies.map((c) => (
              <option key={c.company_id} value={String(c.company_id)}>{c.company_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm" style={{ display: 'block', marginBottom: 4 }}>车位（公司名下团购锁定）</label>
          <select value={spaceId} onChange={(e) => setSpaceId(e.target.value)} style={sel} disabled={!companyId}>
            <option value="">— 选择车位 —</option>
            {companySpaces.map((s) => (
              <option key={s.space_id} value={s.space_id}>{s.space_id}</option>
            ))}
            {companyId && companySpaces.length === 0 && (
              <option value="">该公司暂无团购锁定车位</option>
            )}
          </select>
        </div>
        <div>
          <label className="text-sm" style={{ display: 'block', marginBottom: 4 }}>业主姓名</label>
          <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} style={inp} placeholder="业主姓名" />
        </div>
        <div>
          <label className="text-sm" style={{ display: 'block', marginBottom: 4 }}>联系电话</label>
          <input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} style={inp} placeholder="联系电话" />
        </div>
        <div>
          <label className="text-sm" style={{ display: 'block', marginBottom: 4 }}>房号</label>
          <input value={houseKey} onChange={(e) => setHouseKey(e.target.value)} style={inp} placeholder="如 1-2-301" />
        </div>
        <div>
          <label className="text-sm" style={{ display: 'block', marginBottom: 4 }}>销售金额（元）</label>
          <input
            value={saleAmount}
            onChange={(e) => setSaleAmount(e.target.value.replace(/[^\d.]/g, ''))}
            style={inp}
            placeholder="核销销售金额"
            inputMode="decimal"
          />
        </div>
        <div>
          <label className="text-sm" style={{ display: 'block', marginBottom: 4 }}>车位确认单号</label>
          <input value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} style={inp} placeholder="车位确认单号" />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-primary" onClick={submit} disabled={saving || !companyId}>
            {saving ? '核销中…' : '提交核销'}
          </button>
        </div>
      </div>
      {msg && (
        <div style={{ marginTop: 8, color: msg.type === 'ok' ? '#52c41a' : '#ff4d4f', fontSize: 13 }}>
          {msg.text}
        </div>
      )}
    </div>
  )
}

const sel: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #d9d9d9',
  fontSize: 13,
  background: '#fff',
  width: '100%',
}
const inp: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #d9d9d9',
  fontSize: 13,
  width: '100%',
}
