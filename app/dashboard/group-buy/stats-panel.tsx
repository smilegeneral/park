'use client'

import { useState, useEffect } from 'react'
import type { GroupBuyStat } from '@/lib/types'

// ============================================================
//  团购统计面板
//  - 下拉选择：按部门 / 按团购公司 聚合统计
//  - 选择具体部门或公司 → 列出该车位购买的详细信息
//  - 不选择 → 列出所有部门 / 公司购买的每个车位详情
// ============================================================

export default function StatsPanel({
  byDept,
  byCompany,
}: {
  byDept: GroupBuyStat[]
  byCompany: GroupBuyStat[]
}) {
  const [mode, setMode] = useState<'department' | 'company'>('department')
  const dims = mode === 'company' ? byCompany : byDept
  const [selected, setSelected] = useState<string>('')
  const [detail, setDetail] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // 切换维度或选项时通过 API 重新拉取明细
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ mode })
    if (selected) params.set('key', selected)
    fetch(`/api/group-buy/stats?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDetail(data.rows || [])
      })
      .catch(() => {
        if (!cancelled) setDetail([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, selected])

  return (
    <div>
      <div className="flex mb-3" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as 'department' | 'company')
            setSelected('')
          }}
          style={selStyle}
        >
          <option value="department">按部门</option>
          <option value="company">按团购公司</option>
        </select>

        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={selStyle}
        >
          <option value="">全部{ mode === 'company' ? '团购公司' : '部门' }（列出每个车位详情）</option>
          {dims.map((d) => (
            <option key={d.dim_key} value={d.dim_key}>
              {d.dim_key}（{d.total_spaces} 个 / ¥{Number(d.total_amount).toLocaleString()}）
            </option>
          ))}
        </select>

        {loading && <span className="text-xs text-gray">加载中…</span>}
      </div>

      {/* 聚合汇总 */}
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table className="table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>{ mode === 'company' ? '团购公司' : '部门' }</th>
              <th>总车位</th>
              <th>总金额</th>
              <th>已付车位</th>
              <th>已付金额</th>
              <th>未付车位</th>
              <th>未付金额</th>
            </tr>
          </thead>
          <tbody>
            {dims.map((d) => (
              <tr
                key={d.dim_key}
                style={{ cursor: 'pointer', background: selected === d.dim_key ? '#e6f7ff' : undefined }}
                onClick={() => setSelected(d.dim_key)}
              >
                <td>{d.dim_key}</td>
                <td>{d.total_spaces}</td>
                <td>¥{Number(d.total_amount).toLocaleString()}</td>
                <td>{d.paid_spaces}</td>
                <td>¥{Number(d.paid_amount).toLocaleString()}</td>
                <td>{d.unpaid_spaces}</td>
                <td>¥{Number(d.unpaid_amount).toLocaleString()}</td>
              </tr>
            ))}
            {dims.length === 0 && (
              <tr><td colSpan={7} className="text-gray text-sm">暂无统计信息</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 明细列表 */}
      <div>
        <div className="text-xs text-gray mb-2">
          {selected
            ? `「${selected}」购买的车位明细（共 ${detail.length} 条记录）`
            : `全部${ mode === 'company' ? '团购公司' : '部门' }购买的车位明细（共 ${detail.length} 条记录）`}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>团购公司</th>
                <th>{ mode === 'company' ? '部门' : '部门' }</th>
                <th>联系人</th>
                <th>电话</th>
                <th>车位号列表</th>
                <th>数量</th>
                <th>金额</th>
                <th>付款</th>
                <th>发票</th>
                <th>登记时间</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((p) => (
                <tr key={p.purchase_id}>
                  <td>{p.company_name}</td>
                  <td>{p.department || '-'}</td>
                  <td>{p.contact_person || '-'}</td>
                  <td>{p.contact_phone || '-'}</td>
                  <td style={{ maxWidth: 200, whiteSpace: 'pre-wrap' }}>{p.space_list || '-'}</td>
                  <td>{p.space_count}</td>
                  <td>¥{Number(p.amount).toLocaleString()}</td>
                  <td>{p.is_paid ? '✅已付' : '⏳未付'}</td>
                  <td>{p.invoice_type}</td>
                  <td>{fmtTime(p.created_at)}</td>
                </tr>
              ))}
              {detail.length === 0 && (
                <tr><td colSpan={10} className="text-gray text-sm">暂无记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const selStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #d9d9d9',
  fontSize: 13,
  background: '#fff',
}

function fmtTime(v: any): string {
  if (!v) return '-'
  if (v instanceof Date) return v.toLocaleString('zh-CN')
  if (typeof v === 'string') {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d.toLocaleString('zh-CN')
    return v
  }
  return String(v)
}
