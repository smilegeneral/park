'use client'

import { useState } from 'react'
import type {
  ReportSummary,
  BuildingStat,
  UnitStat,
  ZoneUnsoldStat,
  TopOwnerStat,
  NotBoughtOwnerStat,
} from '@/lib/types'

function fmtMoney(v: any): string {
  const n = Number(v || 0)
  return n ? `¥${n.toLocaleString()}` : '¥0'
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
  byBuilding,
  byUnit,
  unsoldByZone,
  topOwners,
  notBought,
}: {
  summary: ReportSummary
  byBuilding: BuildingStat[]
  byUnit: UnitStat[]
  unsoldByZone: ZoneUnsoldStat[]
  topOwners: TopOwnerStat[]
  notBought: NotBoughtOwnerStat[]
}) {
  const [tab, setTab] = useState<'building' | 'unit' | 'zone' | 'top' | 'notbought'>('building')

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'building', label: '按楼栋统计' },
    { key: 'unit', label: '按楼栋/单元统计' },
    { key: 'zone', label: '按车库未售' },
    { key: 'top', label: '购买最多业主' },
    { key: 'notbought', label: '未购车位业主' },
  ]

  return (
    <div>
      {/* 汇总指标 */}
      <div className="flex" style={{ gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatTile label="已售总金额（含团购）" value={fmtMoney(summary.total_sold_amount)} accent="#fa8c16" />
        <StatTile label="已售车位数" value={`${summary.total_sold_count}`} />
        <StatTile label="其中团购已核销" value={`${summary.group_verified_count}`} />
        <StatTile label="未售车位数" value={`${summary.total_unsold}`} accent="#1677ff" />
      </div>

      {/* 标签页 */}
      <div className="flex" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
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

      {/* 按楼栋 */}
      {tab === 'building' && (
        <Card title="按楼栋统计已售车位个数与金额">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>楼栋</th>
                  <th>已售个数</th>
                  <th>已售金额</th>
                </tr>
              </thead>
              <tbody>
                {byBuilding.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-gray">暂无已售车位</td></tr>
                )}
                {byBuilding.map(r => (
                  <tr key={r.building_no}>
                    <td style={{ fontWeight: 600 }}>{r.building_no || '—'}</td>
                    <td>{r.sold_count}</td>
                    <td style={{ color: '#fa8c16', fontWeight: 600 }}>{fmtMoney(r.sold_amount)}</td>
                  </tr>
                ))}
              </tbody>
              {byBuilding.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700 }}>
                    <td>合计</td>
                    <td>{byBuilding.reduce((s, r) => s + Number(r.sold_count || 0), 0)}</td>
                    <td style={{ color: '#fa8c16' }}>
                      {fmtMoney(byBuilding.reduce((s, r) => s + Number(r.sold_amount || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}

      {/* 按楼栋/单元 */}
      {tab === 'unit' && (
        <Card title="按楼栋 / 单元统计已售车位个数与金额">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>楼栋</th>
                  <th>单元</th>
                  <th>已售个数</th>
                  <th>已售金额</th>
                </tr>
              </thead>
              <tbody>
                {byUnit.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-gray">暂无已售车位</td></tr>
                )}
                {byUnit.map(r => (
                  <tr key={`${r.building_no}-${r.unit_no}`}>
                    <td style={{ fontWeight: 600 }}>{r.building_no || '—'}</td>
                    <td>{r.unit_no || '—'}</td>
                    <td>{r.sold_count}</td>
                    <td style={{ color: '#fa8c16', fontWeight: 600 }}>{fmtMoney(r.sold_amount)}</td>
                  </tr>
                ))}
              </tbody>
              {byUnit.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700 }}>
                    <td colSpan={2}>合计</td>
                    <td>{byUnit.reduce((s, r) => s + Number(r.sold_count || 0), 0)}</td>
                    <td style={{ color: '#fa8c16' }}>
                      {fmtMoney(byUnit.reduce((s, r) => s + Number(r.sold_amount || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}

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
