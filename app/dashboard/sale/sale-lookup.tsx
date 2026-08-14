'use client'

import { useState, useTransition } from 'react'
import { lookupSpace } from '@/lib/actions'
import type { ParkingSpace } from '@/lib/types'
import SaleForm from './sale-form'

// 可继续销售的状态
const SELLABLE = ['未售', '预订']

export default function SaleLookup() {
  const [spaceId, setSpaceId] = useState('')
  const [space, setSpace] = useState<ParkingSpace | null>(null)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function handleLookup() {
    setError('')
    setSpace(null)
    const sid = spaceId.trim()
    if (!sid) {
      setError('请输入车位号')
      return
    }
    startTransition(async () => {
      const res = await lookupSpace(sid)
      if (!res.ok || !res.space) {
        setError(res.error || '查询失败')
        return
      }
      setSpace(res.space)
    })
  }

  // 已查到车位：判断状态
  const status = space?.status
  const sellable = status ? SELLABLE.includes(status) : false

  return (
    <div>
      <div className="flex" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 14, color: '#555', flex: '1 1 240px' }}>
          车位号
          <div style={{ marginTop: 4 }}>
            <input
              className="input"
              value={spaceId}
              onChange={e => { setSpaceId(e.target.value); setError(''); setSpace(null) }}
              onKeyDown={e => { if (e.key === 'Enter') handleLookup() }}
              placeholder="如 A-001"
            />
          </div>
        </label>
        <button type="button" className="btn-primary" onClick={handleLookup} disabled={pending}>
          {pending ? '查询中...' : '查询车位'}
        </button>
      </div>

      {error && (
        <div className="text-red" style={{ marginTop: 10, fontSize: 14, fontWeight: 500 }}>
          ⚠️ {error}
        </div>
      )}

      {space && (
        <div style={{ marginTop: 16 }}>
          {/* 查询结果（可预览打印） */}
          <div className="print-area" style={{
            padding: '14px 16px', borderRadius: 8, marginBottom: 12,
            background: sellable ? '#f6ffed' : '#fff1f0',
            border: `1px solid ${sellable ? '#b7eb8f' : '#ffa39e'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{space.space_id}</span>
              <span className={`badge ${sellable ? 'badge-green' : 'badge-red'}`}>{status}</span>
              <span className="text-sm text-gray">
                {space.space_type} · 默认价 ¥{space.price?.toFixed(0) || '—'}
              </span>
              {space.house_key && (
                <span className="text-sm text-gray">房号：{space.house_key}</span>
              )}
              {space.owner_name && (
                <span className="text-sm text-gray">业主：{space.owner_name}</span>
              )}
            </div>
            {!sellable && (
              <div style={{ marginTop: 6, fontSize: 15, fontWeight: 600, color: '#cf1322' }}>
                车位不可售：当前状态为「{status}」，无法销售。
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-ghost no-print"
            onClick={() => window.print()}
            style={{ fontSize: 13, marginBottom: 12 }}
          >
            🖨️ 预览打印查询结果
          </button>

          {sellable && (
            <>
              {status === '预订' && (
                <div className="no-print" style={{
                  marginBottom: 12, padding: '8px 12px', fontSize: 14, color: '#d46b08',
                  background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f',
                }}>
                  该车位为预订状态，已自动带入预订人{space.booker_name ? `（${space.booker_name}）` : ''}、房号{space.house_key ? `（${space.house_key}）` : ''}等信息，请核对后继续填写销售。
                </div>
              )}
              <SaleForm space={space} initialHouseKey={status === '预订' ? space.house_key || '' : ''} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
