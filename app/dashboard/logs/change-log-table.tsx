'use client'
import { useState } from 'react'
import type { SpaceChangeLog } from '@/lib/types'
import DocPrintPanel from '@/app/dashboard/components/doc-print'

export default function ChangeLogTable({ logs }: { logs: SpaceChangeLog[] }) {
  const [printLog, setPrintLog] = useState<SpaceChangeLog | null>(null)
  const [printDoc, setPrintDoc] = useState<'apply' | 'plate'>('apply')

  return (
    <>
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>业主</th>
                <th>原车位</th>
                <th>原价格</th>
                <th>新车位</th>
                <th>新价格</th>
                <th>差价</th>
                <th>类型</th>
                <th>原因</th>
                <th>经办人</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={12} className="text-center text-gray">暂无变更记录</td></tr>
              )}
              {logs.map(l => (
                <tr key={l.log_id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{l.changed_at?.slice(0, 16)}</td>
                  <td>{l.owner_name}</td>
                  <td style={{ fontWeight: 600 }}>{l.old_space_no}</td>
                  <td>¥{Number(l.old_space_price || 0).toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: '#1677ff' }}>{l.new_space_no}</td>
                  <td>¥{Number(l.new_space_price || 0).toLocaleString()}</td>
                  <td style={{ color: l.price_difference > 0 ? '#fa8c16' : '#333' }}>
                    {l.price_difference > 0 ? '+' : ''}{Number(l.price_difference || 0).toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${l.swap_type === '业主互调' ? 'badge-blue' : 'badge-orange'}`}>
                      {l.swap_type}
                    </span>
                  </td>
                  <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.change_reason}
                  </td>
                  <td>{l.operator}</td>
                  <td>
                    <span className={`badge ${l.process_result === '已完成' ? 'badge-green' : 'badge-gray'}`}>
                      {l.process_result}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '2px 8px', fontSize: 12, marginRight: 6 }}
                      onClick={() => { setPrintLog(l); setPrintDoc('apply') }}
                    >
                      补打申请单
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={() => { setPrintLog(l); setPrintDoc('plate') }}
                    >
                      车位牌
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {printLog && (
        <div className="no-print" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: 13, marginBottom: 8 }}
            onClick={() => setPrintLog(null)}
          >
            ✕ 关闭预览
          </button>
        </div>
      )}
      {printLog && (
        <DocPrintPanel
          changeLog={printLog}
          initialDoc={printDoc}
        />
      )}
    </>
  )
}
