'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import type {
  ReportSummary,
  ZoneStat,
  ZoneUnsoldStat,
  TopOwnerStat,
  NotBoughtOwnerStat,
} from '@/lib/types'

// 金额格式化：按数据库返回的原始数值原样显示，不做任何四舍五入。
// postgres 的 numeric 以字符串返回（如 "123456.78"）；若先转 Number 再
// toLocaleString，会被限制为最多 3 位小数并四舍五入，还会引入浮点误差。
// 这里直接按字符串处理：整数部分加千分位，小数部分原样保留。
function fmtMoney(v: any): string {
  const raw = (v === null || v === undefined ? '' : String(v)).trim()
  if (!raw || /^0*(\.0*)?$/.test(raw)) return '¥0'
  const neg = raw.startsWith('-')
  const body = neg ? raw.slice(1) : raw
  const [intPart, fracPart] = body.split('.')
  const withSep = (intPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `¥${neg ? '-' : ''}${withSep}${fracPart ? '.' + fracPart : ''}`
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="card" style={{ padding: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{title}</h3>
      {children}
    </section>
  )
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card" style={{ padding: '14px 16px', minWidth: 160 }}>
      <div className="text-sm text-gray" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || '#1f1f1f' }}>{value}</div>
    </div>
  )
}

export default function ReportClient({
  summary,
  zones,
  unsoldByZone,
  topOwners,
  notBought,
}: {
  summary: ReportSummary
  zones: ZoneStat[]
  unsoldByZone: ZoneUnsoldStat[]
  topOwners: TopOwnerStat[]
  notBought: NotBoughtOwnerStat[]
}) {
  const [tab, setTab] = useState<'zone' | 'top' | 'notbought'>('zone')

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'zone', label: '按车库未售' },
    { key: 'top', label: '购买最多业主' },
    { key: 'notbought', label: '未购车位业主' },
  ]

  // 导出 Excel：汇总 / 按车库 / 购买最多业主 / 未购业主 四个工作表
  function handleExport() {
    const wb = XLSX.utils.book_new()

    // 1) 汇总指标
    const sumRows = [
      ['指标', '数值'],
      ['已售总金额（含团购已核销/团购锁定）', Number(summary.total_sold_amount)],
      ['已售车位数（含团购）', summary.total_sold_count],
      ['其中团购已核销', summary.group_verified_count],
      ['未售车位数', summary.total_unsold],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sumRows), '汇总指标')

    // 2) 按车库统计
    const zRows: any[] = [['车库区域', '车位总数', '已售车位数', '金额', '未售车位数', '子母车位', '单体车位', '普通车位', '其他类型']]
    zones.forEach(z =>
      zRows.push([
        z.garage_zone, z.total, z.sold_count, Number(z.sold_amount),
        z.unsold_count, z.unsold_sub, z.unsold_single, z.unsold_normal, z.unsold_other,
      ])
    )
    zRows.push([
      '合计',
      zones.reduce((s, z) => s + Number(z.total), 0),
      zones.reduce((s, z) => s + Number(z.sold_count), 0),
      Number(summary.total_sold_amount),
      zones.reduce((s, z) => s + Number(z.unsold_count), 0),
      zones.reduce((s, z) => s + Number(z.unsold_sub), 0),
      zones.reduce((s, z) => s + Number(z.unsold_single), 0),
      zones.reduce((s, z) => s + Number(z.unsold_normal), 0),
      zones.reduce((s, z) => s + Number(z.unsold_other), 0),
    ])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(zRows), '按车库统计')

    // 3) 购买最多业主
    const tRows: any[] = [['排名', '业主', '房号', '车位数', '金额']]
    topOwners.forEach((r, i) =>
      tRows.push([i + 1, r.owner_name, r.house_key || '—', r.space_count, Number(r.total_amount)])
    )
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tRows), '购买最多业主')

    // 4) 未购车位业主
    const nRows: any[] = [['房号', '楼栋', '单元', '房间', '业主', '电话']]
    notBought.forEach(r =>
      nRows.push([r.house_key || '—', r.building_no || '—', r.unit_no || '—', r.room_no || '—', r.owner_name, r.phone || '—'])
    )
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(nRows), '未购车位业主')

    const fileName = `统计报表_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  return (
    <div>
      {/* 汇总指标 + 导出 */}
      <div
        className="flex"
        style={{ gap: 12, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div className="flex" style={{ gap: 12, flexWrap: 'wrap' }}>
          <StatTile label="已售总金额（含团购锁定）" value={fmtMoney(summary.total_sold_amount)} accent="#fa8c16" />
          <StatTile label="已售车位数" value={`${summary.total_sold_count}`} />
          <StatTile label="其中团购已核销" value={`${summary.group_verified_count}`} />
          <StatTile label="未售车位数" value={`${summary.total_unsold}`} accent="#1677ff" />
        </div>
        <button type="button" className="btn-primary" style={{ fontSize: 14 }} onClick={handleExport}>
          ⬇ 导出 Excel
        </button>
      </div>

      {/* 按车库（区域）统计 */}
      <Card title="按车库（区域）统计：车位总数 / 已售 / 金额 / 未售（按类型细分）">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>车库区域</th>
                <th>车位总数</th>
                <th>已售车位数</th>
                <th>金额</th>
                <th>未售车位数</th>
                <th>子母车位</th>
                <th>单体车位</th>
                <th>普通车位</th>
                <th>其他</th>
              </tr>
            </thead>
            <tbody>
              {zones.length === 0 && (
                <tr><td colSpan={9} className="text-center text-gray">暂无数据</td></tr>
              )}
              {zones.map(z => (
                <tr key={z.garage_zone}>
                  <td style={{ fontWeight: 600 }}>{z.garage_zone}</td>
                  <td>{z.total}</td>
                  <td>{z.sold_count}</td>
                  <td style={{ color: '#fa8c16', fontWeight: 600 }}>{fmtMoney(z.sold_amount)}</td>
                  <td>{z.unsold_count}</td>
                  <td>{z.unsold_sub}</td>
                  <td>{z.unsold_single}</td>
                  <td>{z.unsold_normal}</td>
                  <td>{z.unsold_other}</td>
                </tr>
              ))}
            </tbody>
            {zones.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 700 }}>
                  <td>合计</td>
                  <td>{zones.reduce((s, z) => s + Number(z.total), 0)}</td>
                  <td>{zones.reduce((s, z) => s + Number(z.sold_count), 0)}</td>
                  {/* 合计金额直接用 SQL 精确求和结果，避免 Number 浮点累加产生脏小数 */}
                  <td>{fmtMoney(summary.total_sold_amount)}</td>
                  <td>{zones.reduce((s, z) => s + Number(z.unsold_count), 0)}</td>
                  <td>{zones.reduce((s, z) => s + Number(z.unsold_sub), 0)}</td>
                  <td>{zones.reduce((s, z) => s + Number(z.unsold_single), 0)}</td>
                  <td>{zones.reduce((s, z) => s + Number(z.unsold_normal), 0)}</td>
                  <td>{zones.reduce((s, z) => s + Number(z.unsold_other), 0)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* 标签页 */}
      <div className="flex" style={{ gap: 8, margin: '16px 0', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            className={`btn-${tab === t.key ? 'primary' : 'secondary'}`}
            style={{ fontSize: 13 }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 按车库未售 */}
      {tab === 'zone' && (
        <Card title="按车库（区域）统计未售车位个数">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>车库区域</th>
                  <th>未售个数</th>
                </tr>
              </thead>
              <tbody>
                {unsoldByZone.length === 0 && (
                  <tr><td colSpan={2} className="text-center text-gray">暂无未售车位</td></tr>
                )}
                {unsoldByZone.map(r => (
                  <tr key={r.garage_zone}>
                    <td style={{ fontWeight: 600 }}>{r.garage_zone}</td>
                    <td>{r.unsold_count}</td>
                  </tr>
                ))}
              </tbody>
              {unsoldByZone.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700 }}>
                    <td>合计</td>
                    <td>{unsoldByZone.reduce((s, r) => s + Number(r.unsold_count || 0), 0)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}

      {/* 购买最多业主 */}
      {tab === 'top' && (
        <Card title="购买车位最多的业主（按已售车位计数）">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>排名</th>
                  <th>业主</th>
                  <th>房号</th>
                  <th>车位数</th>
                  <th>金额</th>
                </tr>
              </thead>
              <tbody>
                {topOwners.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray">暂无已售记录</td></tr>
                )}
                {topOwners.map((r, i) => (
                  <tr key={r.house_key + r.owner_name + i}>
                    <td style={{ fontFamily: 'monospace' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{r.owner_name}</td>
                    <td>{r.house_key || '—'}</td>
                    <td>{r.space_count}</td>
                    <td style={{ color: '#fa8c16', fontWeight: 600 }}>{fmtMoney(r.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 未购买车位业主 */}
      {tab === 'notbought' && (
        <Card title="未购买车位的业主（在业主档案中但名下无已售/已核销车位）">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>房号</th>
                  <th>楼栋</th>
                  <th>单元</th>
                  <th>房间</th>
                  <th>业主</th>
                  <th>电话</th>
                </tr>
              </thead>
              <tbody>
                {notBought.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray">所有业主均已购买车位</td></tr>
                )}
                {notBought.map(r => (
                  <tr key={r.house_key}>
                    <td style={{ fontWeight: 600 }}>{r.house_key || '—'}</td>
                    <td>{r.building_no || '—'}</td>
                    <td>{r.unit_no || '—'}</td>
                    <td>{r.room_no || '—'}</td>
                    <td>{r.owner_name}</td>
                    <td style={{ fontFamily: 'monospace' }}>{r.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
              {notBought.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700 }}>
                    <td colSpan={3}>共 {notBought.length} 位业主未购买</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
