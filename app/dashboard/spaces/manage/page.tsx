'use client'
import { useCallback, useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { addParkingSpace, cancelParkingSpace, fetchUnsoldSpaces } from '@/lib/actions'
import type { ParkingSpace } from '@/lib/types'
import { AddSpaceSlip, CancelSpaceSlip, type SpaceManageOrder } from '@/dashboard/components/doc-print'
import Link from 'next/link'

// 车库分区选项（与销控图一致）
const ZONES = ['A区', 'B区', 'C区', 'D1区', 'D2区', 'E区']

export default function ManageSpacesPage({
  params,
}: {
  params: { zone: string }
}) {
  const { zone } = params
  const [tab, setTab] = useState<'add' | 'cancel'>('add')
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // ---------------- 新增车位 ----------------
  const [spaceId, setSpaceId] = useState('')
  const [changeOrderNo, setChangeOrderNo] = useState('')
  const [garageZone, setGarageZone] = useState(zone || 'A区')
  const [spaceType, setSpaceType] = useState('')
  const [remarks, setRemarks] = useState('')

  // ---------------- 取消车位 ----------------
  const [unsold, setUnsold] = useState<ParkingSpace[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<string>('')
  const [cancelRemarks, setCancelRemarks] = useState('')
  const [cancelChangeOrderNo, setCancelChangeOrderNo] = useState('')
  const [printOrder, setPrintOrder] = useState<{ kind: 'add' | 'cancel'; order: SpaceManageOrder } | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const loadUnsold = useCallback(() => {
    startTransition(async () => {
      try {
        const list = await fetchUnsoldSpaces()
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
          change_order_no: changeOrderNo,
          garage_zone: garageZone,
          space_type: spaceType,
          remarks,
        })
        setMsg({ type: 'ok', text: `✅ 已新增车位 ${r.space_id}（状态：未售）` })
        setPrintOrder({
          kind: 'add',
          order: {
            change_order_no: changeOrderNo,
            space_id: r.space_id,
            garage_zone: garageZone,
            space_type: spaceType,
            remarks,
            operator: '当前用户',
            apply_date: new Date().toISOString().slice(0, 10),
          },
        })
        setSpaceId('')
        setChangeOrderNo('')
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
        await cancelParkingSpace(selected, cancelRemarks, cancelChangeOrderNo)
        setMsg({ type: 'ok', text: `✅ 车位 ${selected} 已取消，不可销售` })
        const cancelled = unsold.find((s) => s.space_id === selected)
        setPrintOrder({
          kind: 'cancel',
          order: {
            change_order_no: cancelChangeOrderNo,
            space_id: selected,
            garage_zone: cancelled?.garage_zone || '',
            space_type: cancelled?.space_type || '',
            house_key: cancelled?.house_key || '',
            owner_name: cancelled?.owner_name || '',
            price: cancelled?.price,
            reason: cancelRemarks,
            operator: '当前用户',
            apply_date: new Date().toISOString().slice(0, 10),
          },
        })
        setSelected('')
        setCancelRemarks('')
        setCancelChangeOrderNo('')
        loadUnsold()
      } catch (e: any) {
        setMsg({ type: 'err', text: `❌ ${e.message}` })
      }
    })
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* 顶部标题区 */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20, flexWrap: 'wrap', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 6, height: 44, borderRadius: 4,
              background: 'linear-gradient(180deg,#1677ff,#52c41a)',
            }}
          />
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: .5 }}>
              ➕ 车位管理
            </h2>
            <div className="text-sm text-gray" style={{ marginTop: 2 }}>
              新增未售车位 / 取消未售车位（当前分区：{zone}）
            </div>
          </div>
        </div>
        <Link href="/dashboard" className="btn-ghost">← 返回首页</Link>
      </div>

      {/* Tab 切换 - 分段控件 */}
      <div
        style={{
          display: 'inline-flex', gap: 4, padding: 4, marginBottom: 20,
          background: '#f0f2f5', borderRadius: 10,
        }}
      >
        {([
          { key: 'add', label: '➕ 新增车位' },
          { key: 'cancel', label: '🚫 取消车位' },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); if (t.key === 'cancel' && !loaded) loadUnsold() }}
            style={{
              padding: '10px 22px', border: 'none', borderRadius: 7, fontSize: 15, fontWeight: 600,
              cursor: 'pointer', transition: 'all .2s',
              background: tab === t.key ? '#fff' : 'transparent',
              color: tab === t.key ? '#1677ff' : '#666',
              boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,.12)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        {msg && (
          <div
            className={msg.type === 'ok' ? 'alert-success' : 'alert-error'}
            style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
          >
            <span style={{ fontSize: 18 }}>{msg.type === 'ok' ? '✅' : '⚠️'}</span>
            <span>{msg.text}</span>
            {printOrder && (
              <button type="button" className="btn-primary no-print" style={{ marginLeft: 'auto', fontSize: 13 }} onClick={() => window.print()}>
                🖨️ 打印{printOrder.kind === 'add' ? '新增车位' : '取消车位'}单据
              </button>
            )}
          </div>
        )}

        {/* ============ 新增车位 ============ */}
        {tab === 'add' && (
          <form onSubmit={handleAdd} style={{ maxWidth: 520 }}>
            <div
              style={{
                background: '#fafcff', border: '1px solid #eef3fb', borderRadius: 8,
                padding: '18px 20px',
              }}
            >
              <div className="form-row">
                <label className="form-label">变更单号</label>
                <input
                  className="form-input"
                  value={changeOrderNo}
                  placeholder="如 BG-2026-001（选填）"
                  onChange={(e) => setChangeOrderNo(e.target.value)}
                />
                <div className="text-xs text-gray" style={{ marginTop: 4 }}>本次变更对应的单据编号，将记入台账变更日志</div>
              </div>

              <div className="form-row">
                <label className="form-label">车位号 <span className="text-red">*</span></label>
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
            </div>

            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              <button type="submit" className="btn-primary" disabled={pending}>
                {pending ? '提交中…' : '💾 确认新增'}
              </button>
              <button
                type="button" className="btn-ghost"
                onClick={() => { setSpaceId(''); setSpaceType(''); setRemarks('') }}
                disabled={pending}
              >
                清空
              </button>
            </div>
          </form>
        )}

        {/* ============ 取消车位 ============ */}
        {tab === 'cancel' && (
          <form onSubmit={handleCancel} style={{ maxWidth: 520 }}>
            <div
              style={{
                background: '#fff7f7', border: '1px solid #ffe0e0', borderRadius: 8,
                padding: '12px 16px', marginBottom: 18, color: '#cf1322', fontSize: 14,
              }}
            >
              ⚠️ 仅可取消「未售」状态的车位，取消后变为「取消」状态，<b>不可销售</b>。
            </div>

            <div
              style={{
                background: '#fafcff', border: '1px solid #eef3fb', borderRadius: 8,
                padding: '18px 20px',
              }}
            >
              <div className="form-row">
                <label className="form-label">变更单号</label>
                <input
                  className="form-input"
                  value={cancelChangeOrderNo}
                  placeholder="如 QX-2026-001（选填）"
                  onChange={(e) => setCancelChangeOrderNo(e.target.value)}
                />
                <div className="text-xs text-gray" style={{ marginTop: 4 }}>本次取消对应的单据编号，将记入台账变更日志</div>
              </div>

              <div className="form-row">
                <label className="form-label">选择未售车位 <span className="text-red">*</span></label>
                {!loaded ? (
                  <button type="button" className="btn-ghost" onClick={loadUnsold} disabled={pending}>
                    {pending ? '加载中…' : '🔄 加载未售车位列表'}
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
            </div>

            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              <button type="submit" className="btn-danger" disabled={pending || !selected}>
                {pending ? '提交中…' : '🚫 确认取消车位'}
              </button>
            </div>
          </form>
        )}
      </div>

      {mounted && printOrder && createPortal(
        <div className="print-only">
          {printOrder.kind === 'add'
            ? <AddSpaceSlip order={printOrder.order} />
            : <CancelSpaceSlip order={printOrder.order} />}
        </div>,
        document.body,
      )}
    </div>
  )
}
