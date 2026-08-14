import { getSpacesByZone, getZones } from '@/lib/queries'
import SpaceGrid from './space-grid'
import Link from 'next/link'

// ============================================================
//  销控图 - 按区域展示所有车位状态
//  灰色=未售 黄色=预订 蓝色=已售 橙色=团购锁定 紫色=已核销
// ============================================================

export default async function SpacesPage({
  searchParams,
}: {
  searchParams: { zone?: string }
}) {
  const zones = await getZones()
  const currentZone = searchParams.zone || zones[0] || 'A区'
  const spaces = await getSpacesByZone(currentZone)

  // 统计当前区域
  const zoneStats = {
    total: spaces.length,
    unsold: spaces.filter(s => s.status === '未售').length,
    locked: spaces.filter(s => s.status === '预订' || s.status === '团购锁定').length,
    sold: spaces.filter(s => s.status === '已售' || s.status === '已核销').length,
  }

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      {/* 顶部 */}
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>🗺️ 销控图</h1>
          <p className="text-sm text-gray">点击灰色车位可锁定，锁定后可在「零售销售」中确认</p>
        </div>
        <Link href="/dashboard" style={{ fontSize: 14 }}>← 返回仪表盘</Link>
      </header>

      {/* 区域切换 */}
      <section className="card mb-4">
        <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
          {zones.map(z => (
            <a
              key={z}
              href={`/dashboard/spaces?zone=${encodeURIComponent(z)}`}
              style={{
                padding: '6px 14px', borderRadius: 4, fontSize: 13,
                background: z === currentZone ? '#1677ff' : '#f5f5f5',
                color: z === currentZone ? '#fff' : '#333',
                border: '1px solid ' + (z === currentZone ? '#1677ff' : '#d9d9d9'),
              }}
            >
              {z}
            </a>
          ))}
        </div>
      </section>

      {/* 当前区域统计 */}
      <section className="grid mb-4" style={{
        gridTemplateColumns: 'repeat(3,1fr)', gap: 12,
      }}>
        <div className="card text-center">
          <div className="text-sm text-gray">本区总车位</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{zoneStats.total}</div>
        </div>
        <div className="card text-center">
          <div className="text-sm text-gray"><span className="status-dot dot-unsold" />未售/锁定</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#faad14' }}>{zoneStats.unsold + zoneStats.locked}</div>
        </div>
        <div className="card text-center">
          <div className="text-sm text-gray"><span className="status-dot dot-sold" />已售/核销</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>{zoneStats.sold}</div>
        </div>
      </section>

      {/* 图例 */}
      <section className="card mb-4">
        <div className="flex" style={{ gap: 16, fontSize: 13, flexWrap: 'wrap' }}>
          <Legend color="#d9d9d9" label="未售（可点击锁定）" />
          <Legend color="#faad14" label="预订" />
          <Legend color="#fa8c16" label="团购锁定" />
          <Legend color="#1677ff" label="已售" />
          <Legend color="#722ed1" label="已核销" />
        </div>
      </section>

      {/* 车位网格 */}
      <SpaceGrid spaces={spaces} zone={currentZone} />
    </main>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex" style={{ alignItems: 'center', gap: 4 }}>
      <span style={{ width: 14, height: 14, background: color, borderRadius: 3, display: 'inline-block', border: '1px solid #ccc' }} />
      <span className="text-gray">{label}</span>
    </div>
  )
}
