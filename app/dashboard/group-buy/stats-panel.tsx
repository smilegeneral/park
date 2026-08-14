'use client'
import { useMemo, useState } from 'react'

// ============================================================
//  团购统计面板
//  支持按【部门】或【团购公司】查询：
//    已售车位数 / 总金额 / 已付款车位数 / 已付款金额
//    / 未付款车位数 / 未付款金额
// ============================================================

export default function StatsPanel({
  byDept,
  byCompany,
}: {
  byDept: any[]
  byCompany: any[]
}) {
  const [mode, setMode] = useState<'department' | 'company'>('department')
  const [q, setQ] = useState('')
  const data = mode === 'department' ? byDept : byCompany

  const filtered = useMemo(() => {
    if (!q.trim()) return data
    return data.filter(d => (d.dim_key || '').toLowerCase().includes(q.trim().toLowerCase()))
  }, [data, q])

  const total = useMemo(() => {
    return filtered.reduce(
      (acc, d) => ({
        total_spaces: acc.total_spaces + Number(d.total_spaces),
        total_amount: acc.total_amount + Number(d.total_amount),
        paid_spaces: acc.paid_spaces + Number(d.paid_spaces),
        paid_amount: acc.paid_amount + Number(d.paid_amount),
        unpaid_spaces: acc.unpaid_spaces + Number(d.unpaid_spaces),
        unpaid_amount: acc.unpaid_amount + Number(d.unpaid_amount),
      }),
      { total_spaces: 0, total_amount: 0, paid_spaces: 0, paid_amount: 0, unpaid_spaces: 0, unpaid_amount: 0 }
    )
  }, [filtered])

  return (
    <div>
      {/* 工具条：维度切换 + 搜索 */}
      <div className="flex" style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'inline-flex', border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setMode('department')}
            style={{ padding: '6px 14px', fontSize: 13, border: 'none', cursor: 'pointer',
              background: mode === 'department' ? '#1677ff' : '#fff', color: mode === 'department' ? '#fff' : '#333' }}
          >
            按部门
          </button>
          <button
            type="button"
            onClick={() => setMode('company')}
            style={{ padding: '6px 14px', fontSize: 13, border: 'none', borderLeft: '1px solid #d9d9d9', cursor: 'pointer',
              background: mode === 'company' ? '#1677ff' : '#fff', color: mode === 'company' ? '#fff' : '#333' }}
          >
            按团购公司
          </button>
        </div>
        <input
          className="input"
          style={{ flex: '0 0 220px' }}
          placeholder={mode === 'department' ? '搜索部门…' : '搜索公司…'}
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {/* 合计条 */}
      {filtered.length > 0 && (
        <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 10 }}>
          <b>合计</b>（{filtered.length} 项）：已售 <b>{total.total_spaces}</b> 个 ·
          总金额 <b>¥{total.total_amount.toLocaleString()}</b> ·
          已付款 {total.paid_spaces} 个 / ¥{total.paid_amount.toLocaleString()} ·
          未付款 {total.unpaid_spaces} 个 / ¥{total.unpaid_amount.toLocaleString()}
        </div>
      )}

      {/* 表格 */}
      {filtered.length === 0 ? (
        <p className="text-gray text-sm">暂无数据。</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>{mode === 'department' ? '部门' : '团购公司'}</th>
                <th>已售车位数</th>
                <th>总金额</th>
                <th>已付款车位数</th>
                <th>已付款金额</th>
                <th>未付款车位数</th>
                <th>未付款金额</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.dim_key}>
                  <td style={{ fontWeight: 600 }}>{d.dim_key}</td>
                  <td>{Number(d.total_spaces)}</td>
                  <td>¥{Number(d.total_amount).toLocaleString()}</td>
                  <td style={{ color: '#52c41a' }}>{Number(d.paid_spaces)}</td>
                  <td style={{ color: '#52c41a' }}>¥{Number(d.paid_amount).toLocaleString()}</td>
                  <td style={{ color: '#faad14' }}>{Number(d.unpaid_spaces)}</td>
                  <td style={{ color: '#faad14' }}>¥{Number(d.unpaid_amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
