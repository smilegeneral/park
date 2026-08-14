'use client'
import { useState, useTransition } from 'react'
import { bookSpace, cancelBooking } from '@/lib/actions'
import type { ParkingSpace } from '@/lib/types'

// ============================================================
//  车位网格 - Client Component
//  未售车位点击 → 弹出预订窗口（预订人/电话）
//  预订车位点击 → 确认解除预订
// ============================================================

const STATUS_STYLE: Record<string, { bg: string; border: string; cursor: string; title: string }> = {
  '未售':  { bg: '#e8e8e8', border: '#bbb', cursor: 'pointer', title: '点击预订' },
  '预订':  { bg: '#fff7e6', border: '#faad14', cursor: 'pointer', title: '点击解除预订' },
  '团购锁定': { bg: '#fff1e6', border: '#fa8c16', cursor: 'not-allowed', title: '团购锁定中' },
  '已售':  { bg: '#e6f7ff', border: '#1677ff', cursor: 'not-allowed', title: '已售' },
  '已核销': { bg: '#f3e8ff', border: '#722ed1', cursor: 'not-allowed', title: '团购已核销' },
  '取消':  { bg: '#f5f5f5', border: '#ddd', cursor: 'not-allowed', title: '取消' },
}

export default function SpaceGrid({
  spaces,
  zone,
}: {
  spaces: ParkingSpace[]
  zone: string
}) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [booking, setBooking] = useState<ParkingSpace | null>(null)

  const grouped = spaces.reduce<Record<string, ParkingSpace[]>>((acc, s) => {
    const key = s.building_no || '未知'
    ;(acc[key] ||= []).push(s)
    return acc
  }, {})

  function handleClick(space: ParkingSpace) {
    setMsg(null)
    if (space.status === '未售') {
      setBooking(space)
    } else if (space.status === '预订') {
      if (!confirm(`确认解除 ${space.space_id} 的预订${space.booker_name ? '（' + space.booker_name + '）' : ''}？`)) return
      startTransition(async () => {
        try {
          await cancelBooking(space.space_id)
          setMsg({ type: 'ok', text: `✅ 车位 ${space.space_id} 已解除预订` })
          setTimeout(() => location.reload(), 600)
        } catch (e: any) {
          setMsg({ type: 'err', text: `❌ ${e.message}` })
        }
      })
    }
  }

  function submitBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!booking) return
    const form = e.target as HTMLFormElement
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value
    const houseKey = (form.elements.namedItem('houseKey') as HTMLInputElement).value
    startTransition(async () => {
      try {
        await bookSpace({ space_id: booking.space_id, booker_name: name, booker_phone: phone, house_key: houseKey })
        setMsg({ type: 'ok', text: `✅ 车位 ${booking.space_id} 已预订（${name}）` })
        setBooking(null)
        setTimeout(() => location.reload(), 600)
      } catch (e: any) {
        setMsg({ type: 'err', text: `❌ ${e.message}` })
      }
    })
  }

  return (
    <div>
      {msg && (
        <div className={msg.type === 'ok' ? 'text-green' : 'text-red'} style={{ marginBottom: 12, fontSize: 14, fontWeight: 500 }}>
          {msg.text}
        </div>
      )}

      {booking && (
        <div className="card mb-4" style={{ background: '#fffdf5' }}>
          <div className="text-sm" style={{ fontWeight: 600, marginBottom: 8 }}>
            预订车位 {booking.space_id}
          </div>
          <form onSubmit={submitBooking} className="flex" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label className="text-sm" style={{ flex: '1 1 180px' }}>
              预订人 *
              <input name="name" className="input mt-2" required placeholder="预订人姓名" />
            </label>
            <label className="text-sm" style={{ flex: '1 1 180px' }}>
              联系电话 *
              <input name="phone" className="input mt-2" required placeholder="手机号" />
            </label>
            <label className="text-sm" style={{ flex: '1 1 180px' }}>
              房号 *
              <input name="houseKey" className="input mt-2" required placeholder="如 1-1-101" />
            </label>
            <button type="submit" className="btn-warning" disabled={pending} style={{ fontSize: 13 }}>确认预订</button>
            <button type="button" className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setBooking(null)}>取消</button>
          </form>
        </div>
      )}

      {Object.entries(grouped).map(([building, list]) => (
        <section key={building} className="mb-4">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#555' }}>
            🏢 {zone} · {building}号楼
            <span className="text-xs text-gray" style={{ marginLeft: 8 }}>({list.length} 个车位)</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 4 }}>
            {list.map(s => {
              const st = STATUS_STYLE[s.status] || STATUS_STYLE['未售']
              return (
                <button
                  key={s.space_id}
                  onClick={() => handleClick(s)}
                  disabled={pending || ['已售', '已核销', '团购锁定', '取消'].includes(s.status)}
                  title={`${s.space_id} - ${s.status}${s.booker_name ? ' (预订人:' + s.booker_name + '/' + (s.booker_phone || '') + ')' : ''}`}
                  style={{
                    padding: '6px 2px', fontSize: 11, borderRadius: 3,
                    background: st.bg, border: `1px solid ${st.border}`,
                    cursor: st.cursor, textAlign: 'center',
                    color: s.status === '已售' ? '#1677ff' : s.status === '预订' ? '#fa8c16' : s.status === '已核销' ? '#722ed1' : '#333',
                    fontWeight: s.status !== '未售' ? 600 : 400,
                  }}
                >
                  {s.space_id.replace(zone + '-', '')}
                  {s.status === '预订' && <div style={{ fontSize: 9, color: '#fa8c16' }}>🔒</div>}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
