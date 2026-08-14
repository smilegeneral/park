'use client'
import { useState, useTransition, useRef } from 'react'
import { verifyGroupBuy } from '@/lib/actions'
import type { ParkingSpace } from '@/lib/types'

// ============================================================
//  团购核销面板 - 把团购锁定车位转给最终业主
//  流程：选工位 → 输入房屋编号 → 自动带出业主姓名/电话 → 确认核销
//  核销效果：团购锁定 → 已售，并写入业主档案
// ============================================================

export default function VerifyPanel({
  lockedSpaces,
  companies,
}: {
  lockedSpaces: ParkingSpace[]
  companies: any[]
}) {
  const [spaceId, setSpaceId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [houseKey, setHouseKey] = useState('')
  const [ownerHint, setOwnerHint] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const fetchingRef = useRef(false)

  // 选车位后自动带出公司
  function handleSpaceChange(id: string) {
    setSpaceId(id)
    const sp = lockedSpaces.find(s => s.space_id === id)
    if (sp?.group_company) {
      const comp = companies.find(c => c.company_name === sp.group_company)
      if (comp) setCompanyId(String(comp.company_id))
    }
  }

  // 输入房屋编号（完整如 1-1-101）→ 自动带出业主
  async function handleHouseKeyChange(v: string) {
    setHouseKey(v)
    setOwnerHint(null)
    if (!v.trim()) return
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const res = await fetch(`/api/owner?house_key=${encodeURIComponent(v.trim())}`)
      const data = await res.json()
      if (data.ok && data.found) {
        setOwnerName(data.owner.owner_name || '')
        setOwnerPhone(data.owner.phone || '')
        setOwnerHint(`已带出业主档案：${data.owner.owner_name}${data.owner.phone ? ' · ' + data.owner.phone : ''}${data.owner.phone2 ? ' · 二电话 ' + data.owner.phone2 : ''}`)
      } else {
        setOwnerHint(null)
      }
    } catch {
      setOwnerHint(null)
    } finally {
      fetchingRef.current = false
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!spaceId) return setMsg({ type: 'err', text: '请选择车位' })
    if (!companyId) return setMsg({ type: 'err', text: '请选择团购公司' })
    if (!houseKey) return setMsg({ type: 'err', text: '请输入房屋编号' })
    if (!ownerName) return setMsg({ type: 'err', text: '请输入业主姓名' })

    startTransition(async () => {
      try {
        const res = await verifyGroupBuy({
          company_id: parseInt(companyId),
          space_id: spaceId,
          owner_name: ownerName,
          owner_phone: ownerPhone,
          house_key: houseKey,
          operator: '当前用户',
        })
        setMsg({ type: 'ok', text: `✅ 核销成功！车位 ${spaceId} 已转让为已售（业主 ${ownerName}）` })
        setSpaceId(''); setCompanyId(''); setOwnerName(''); setOwnerPhone(''); setHouseKey(''); setOwnerHint(null)
        setTimeout(() => location.reload(), 1200)
      } catch (e: any) {
        setMsg({ type: 'err', text: `❌ ${e.message}` })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="团购锁定车位">
          <select className="select" value={spaceId} onChange={e => handleSpaceChange(e.target.value)}>
            <option value="">-- 选择 --</option>
            {lockedSpaces.map(s => (
              <option key={s.space_id} value={s.space_id}>
                {s.space_id} ({s.group_company || '未知公司'})
              </option>
            ))}
          </select>
        </Field>
        <Field label="团购公司">
          <select className="select" value={companyId} onChange={e => setCompanyId(e.target.value)}>
            <option value="">-- 选择 --</option>
            {companies.map(c => (
              <option key={c.company_id} value={String(c.company_id)}>
                {c.company_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="房屋编号（先输入，自动带出业主）">
          <input className="input" value={houseKey} onChange={e => handleHouseKeyChange(e.target.value)} placeholder="如 1-1-101" />
        </Field>
        <Field label="业主姓名">
          <input className="input" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="自动带出，可修改" />
        </Field>
        <Field label="业主电话">
          <input className="input" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} placeholder="自动带出，可修改" />
        </Field>
      </div>

      {ownerHint && (
        <div style={{ marginTop: 8, fontSize: 13, color: '#1677ff', background: '#e6f4ff', border: '1px solid #91caff', borderRadius: 6, padding: '6px 10px' }}>
          {ownerHint}
        </div>
      )}

      {msg && (
        <div className={msg.type === 'ok' ? 'text-green' : 'text-red'} style={{ marginTop: 8, fontSize: 13, fontWeight: 500 }}>
          {msg.text}
        </div>
      )}

      <button type="submit" className="btn-success mt-4" disabled={pending} style={{ fontSize: 14 }}>
        {pending ? '处理中...' : '✅ 确认核销'}
      </button>
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
