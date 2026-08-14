'use client'
import { useState, useTransition } from 'react'
import { createGroupBuy } from '@/lib/actions'

// ============================================================
//  团购下单面板 - 选择车位批量锁定
// ============================================================

export default function GroupBuyPanel({ company }: { company: any }) {
  const [selected, setSelected] = useState<string[]>([])
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  // 这里简化：让用户手动输入车位编号（批量）
  const [spaceInput, setSpaceInput] = useState('')

  function toggle(sid: string) {
    setSelected(prev =>
      prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const ids = spaceInput.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean)
    if (ids.length === 0) return setMsg({ type: 'err', text: '请输入车位编号' })

    startTransition(async () => {
      try {
        const res = await createGroupBuy({
          company_id: company.company_id,
          space_ids: ids,
          operator: '当前用户',
        })
        setMsg({ type: 'ok', text: `✅ 成功锁定 ${res.locked_count} 个车位` })
        setSpaceInput(''); setSelected([])
        setTimeout(() => location.reload(), 1000)
      } catch (e: any) {
        setMsg({ type: 'err', text: `❌ ${e.message}` })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
        <div>
          <label className="text-sm">车位编号（逗号或空格分隔）</label>
          <input
            className="input mt-2"
            value={spaceInput}
            onChange={e => setSpaceInput(e.target.value)}
            placeholder="如：A-001, A-002, A-005"
          />
        </div>
        <div className="flex" style={{ alignItems: 'flex-end' }}>
          <button type="submit" className="btn-warning" disabled={pending} style={{ fontSize: 13 }}>
            {pending ? '处理中...' : '🔒 批量锁定'}
          </button>
        </div>
      </div>
      {msg && (
        <div className={msg.type === 'ok' ? 'text-green' : 'text-red'} style={{ marginTop: 6, fontSize: 13 }}>
          {msg.text}
        </div>
      )}
    </form>
  )
}
