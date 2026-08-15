import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getGarageMaps, getUnsoldSpacesByZone } from '@/lib/queries'
import { GARAGE_ZONES } from '@/lib/types'
import SignOutButton from '../sign-out-button'
import DistributionUploader from './distribution-uploader'

// ============================================================
//  车位分布图 - 管理员上传六区图片，下方显示未售车位列表
//  访客(guest) 登录后仅能访问此页面
// ============================================================
export default async function DistributionPage() {
  const session = await auth()
  if (!session) throw new Error('未登录')

  const user = session.user as any
  const role = user?.role ?? 1
  const isAdmin = role >= 2   // 仅管理员可上传图片
  const displayName = user?.display_name || user?.name

  // 并行查询六区图片 + 六区未售车位
  const maps = await getGarageMaps()
  const mapByZone = new Map(maps.map(m => [m.zone, m]))

  const zonesData = await Promise.all(
    GARAGE_ZONES.map(async z => ({
      zone: z,
      spaces: await getUnsoldSpacesByZone(z),
    }))
  )

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      <header className="flex" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>🅿️ 车位分布图</h1>
          <p className="text-sm text-gray">
            欢迎，{displayName} · 角色：{role === 3 ? '超级管理员' : role === 2 ? '管理员' : role === 1 ? '销售员' : '访客'}
          </p>
        </div>
        <div className="flex" style={{ gap: 8 }}>
          {role !== 0 && <Link href="/dashboard" className="btn-ghost" style={{ fontSize: 14 }}>返回首页</Link>}
          <SignOutButton />
        </div>
      </header>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {zonesData.map(({ zone, spaces }) => {
          const map = mapByZone.get(zone)
          return (
            <section key={zone} className="card" style={{ padding: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
                {zone} <span className="text-sm text-gray">（未售 {spaces.length} 个）</span>
              </h2>

              {/* 车库图片 */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16 / 10',
                  background: '#f5f5f5',
                  border: '1px dashed #d9d9d9',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  marginBottom: 12,
                }}
              >
                {map?.image_url ? (
                  <img
                    src={map.image_url}
                    alt={`${zone}车位分布`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span className="text-sm text-gray">暂无分布图（管理员可上传）</span>
                )}
              </div>

              {/* 管理员可上传 */}
              {isAdmin && (
                <DistributionUploader
                  zone={zone}
                  currentName={map?.image_name}
                />
              )}

              {/* 未售车位列表 */}
              <div style={{ marginTop: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>未售车位</h3>
                {spaces.length === 0 ? (
                  <p className="text-sm text-gray">该区暂无未售车位</p>
                ) : (
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ fontSize: 14 }}>车位号</th>
                          <th style={{ fontSize: 14 }}>区域</th>
                          <th style={{ fontSize: 14 }}>类型</th>
                          <th style={{ fontSize: 14 }}>价格(元)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spaces.map(s => (
                          <tr key={s.space_id}>
                            <td style={{ fontSize: 14 }}>{s.space_id}</td>
                            <td style={{ fontSize: 14 }}>{s.garage_zone}</td>
                            <td style={{ fontSize: 14 }}>{s.space_type || '-'}</td>
                            <td style={{ fontSize: 14 }}>{s.price ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
