'use client'
import { use, useCallback, useState, useTransition } from 'react'
import { addParkingSpace, cancelParkingSpace } from '@/lib/actions'
import { getUnsoldSpaces } from '@/lib/queries'
import type { ParkingSpace } from '@/lib/types'
import Link from 'next/link'

// 车库分区选项（与销控图一致）
const ZONES = ['A区', 'B区', 'C区', 'D1区', 'D2区', 'E区']

export default function ManageSpacesPage({
  params,
}: {
  params: Promise<{ zone: string }>
}) {
  const { zone } = use(params)
  const [tab, setTab] = useState<'add' | 'cancel'>('add')
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // ---------------- 新增车位 ----------------
  const [spaceId, setSpaceId] = useState('')
  const [garageZone, setGarageZone] = useState(zone || 'A区')
  const [spaceType, setSpaceType] = useState('')
  const [remarks, setRemarks] = useState('')

  // ---------------- 取消车位 ----------------
  const [unsold, setUnsold] = useState<ParkingSpace[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<string>('')
  const [cancelRemarks, setCancelRemarks] = useState('')

  const loadUnsold = useCallback(() => {
    startTransition(async () => {
      try {
        const list = await getUnsoldSpaces()
        setUnsold(list)
        setLoaded(true)
        setSelected('')
      } catch (e: any) {
        setMsg({ type: 'err', text: `❌ 加载未售车位失败：${e.message}` })
      }
    })
  }, [])

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    startTransition(async () => {
      try {
        const r = await addParkingSpace({
          space_id: spaceId,
          garage_zone: garageZone,
          space_type: spaceType,
          remarks,
        })
        setMsg({ type: 'ok', text: `✅ 已新增车位 ${r.space_id}（状态：未售）` })
        setSpaceId('')
        setSpaceType('')
        setRemarks('')
      } catch (e: any) {
        setMsg({ type: 'err', text: `❌ ${e.message}` })
      }
    })
  }

  function handleCancel(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!selected) {
      setMsg({ type: 'err', text: '请选择要取消的车位' })
      return
    }
    if (!confirm(`确认取消车位 ${selected}？取消后该车位将不可销售。`)) return
    startTransition(async () => {
      try {
        await cancelParkingSpace(selected, cancelRemarks)
        setMsg({ type: 'ok', text: `✅ 车位 ${selected} 已取消，不可销售` })
        setSelected('')
        setCancelRemarks('')
        loadUnsold()
      } catch (e: any) {
        setMsg({ type: 'err', text: `❌ ${e.message}` })
      }
    })
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>➕ 车位管理（新增 / 取消）</h2>
          <div className="text-sm text-gray" style={{ marginTop: 4 }}>当前分区：{zone}</div>
        </div>
        <Link href={`/dashboard/spaces/${zone}`} className="btn-ghost">← 返回销控图</Link>
      </div>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
        <button
          className={tab === 'add' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setTab('add')}
          type="button"
        >新增车位</button>
        <button
          className={tab === 'cancel' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => { setTab('cancel'); if (!loaded) loadUnsold() }}
          type="button"
        >取消车位</button>
      </div>

      {msg && (
        <div className={msg.type === 'ok' ? 'alert-success' : 'alert-error'} style={{ marginBottom: 16 }}>
          {msg.text}
        </div>
      )}

      {/* ============ 新增车位 ============ */}
      {tab === 'add' && (
        <form onSubmit={handleAdd} style={{ maxWidth: 520 }}>
          <div className="form-row">
            <label className="form-label">车位号 <span style={{ color: '#f5222d' }}>*</span></label>
            <input
              className="form-input"
              value={spaceId}
              placeholder="如 A-001 / B-023"
              onChange={(e) => setSpaceId(e.target.value)}
              required
            />
            <div className="text-xs text-gray" style={{ marginTop: 4 }}>车位台账主键，不可重复</div>
          </div>

          <div className="form-row">
            <label className="form-label">车库分区</label>
            <select className="form-input" value={garageZone} onChange={(e) => setGarageZone(e.target.value)}>
              {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>

          <div className="form-row">
            <label className="form-label">车位类型</label>
            <input
              className="form-input"
              value={spaceType}
              placeholder="如 标准车位 / 子母车位 / 微型车位（选填）"
              onChange={(e) => setSpaceType(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label className="form-label">备注</label>
            <input
              className="form-input"
              value={remarks}
              placeholder="选填"
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={pending} style={{ marginTop: 8 }}>
            {pending ? '提交中…' : '确认新增'}
          </button>
        </form>
      )}

      {/* ============ 取消车位 ============ */}
      {tab === 'cancel' && (
        <form onSubmit={handleCancel} style={{ maxWidth: 520 }}>
          <div className="text-sm text-gray" style={{ marginBottom: 12 }}>
            仅可取消「未售」状态的车位，取消后将变为「取消」状态，不可销售。
          </div>

          <div className="form-row">
            <label className="form-label">选择未售车位 <span style={{ color: '#f5222d' }}>*</span></label>
            {!loaded ? (
              <button type="button" className="btn-ghost" onClick={loadUnsold} disabled={pending}>
                {pending ? '加载中…' : '加载未售车位列表'}
              </button>
            ) : (
              <select className="form-input" value={selected} onChange={(e) => setSelected(e.target.value)} required>
                <option value="">— 请选择 —</option>
                {unsold.map((s) => (
                  <option key={s.space_id} value={s.space_id}>
                    {s.space_id}{s.space_type ? `（${s.space_type}）` : ''}{s.building_no ? ` · ${s.building_no}号楼` : ''}
                  </option>
                ))}
              </select>
            )}
            {loaded && unsold.length === 0 && (
              <div className="text-xs text-gray" style={{ marginTop: 4 }}>当前没有「未售」车位可供取消。</div>
            )}
          </div>

          <div className="form-row">
            <label className="form-label">取消原因</label>
            <input
              className="form-input"
              value={cancelRemarks}
              placeholder="选填"
              onChange={(e) => setCancelRemarks(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-danger" disabled={pending || !selected} style={{ marginTop: 8 }}>
            {pending ? '提交中…' : '确认取消车位'}
          </button>
        </form>
      )}
    </div>
  )
}
