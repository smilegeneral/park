import { getAllGroupCompanies, getSpacesByStatus, getGroupBuyPurchases, getGroupBuyStats } from '@/lib/queries'
import GroupBuyPanel from './group-buy-panel'
import VerifyPanel from './verify-panel'
import PurchasePanel from './purchase-panel'
import StatsPanel from './stats-panel'
import Link from 'next/link'

// ============================================================
//  团购管理 - 团购下单 + 公司购买 + 核销转业主
// ============================================================

export default async function GroupBuyPage() {
  const [companies, unsold, purchases, statsByDept, statsByCompany] = await Promise.all([
    getAllGroupCompanies(),
    getSpacesByStatus('未售'),
    getGroupBuyPurchases(),
    getGroupBuyStats('department'),
    getGroupBuyStats('company'),
  ])

  const locked = await getSpacesByStatus('团购锁定')

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>🏢 团购管理</h1>
          <p className="text-sm text-gray">公司批量购车位 → 逐个核销转给业主</p>
        </div>
        <Link href="/dashboard" style={{ fontSize: 14 }}>← 返回</Link>
      </header>

      {/* 概览 */}
      <section className="grid mb-4" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <div className="card text-center">
          <div className="text-sm text-gray">团购公司</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{companies.length}</div>
        </div>
        <div className="card text-center">
          <div className="text-sm text-gray">团购锁定中</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fa8c16' }}>{locked.length}</div>
        </div>
        <div className="card text-center">
          <div className="text-sm text-gray">可购未售</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>{unsold.length}</div>
        </div>
      </section>

      {/* 团购统计 */}
      <section className="card mb-4">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>团购统计（按部门 / 团购公司）</h2>
        <StatsPanel byDept={statsByDept} byCompany={statsByCompany} />
      </section>

      {/* 团购公司列表 + 下单 */}
      <section className="card mb-4">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>团购下单 / 公司购买</h2>
        {companies.length === 0 ? (
          <p className="text-gray text-sm">暂无团购公司，请先在数据库中录入。</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {companies.map(c => (
              <CompanyCard key={c.company_id} company={c} unsoldCount={unsold.length} />
            ))}
          </div>
        )}
      </section>

      {/* 团购核销 */}
      <section className="card mb-4">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>团购核销（公司→业主）</h2>
        {locked.length === 0 ? (
          <p className="text-gray text-sm">暂无团购锁定车位可核销。</p>
        ) : (
          <VerifyPanel lockedSpaces={locked} companies={companies} />
        )}
      </section>

      {/* 团购公司购买记录 */}
      <section className="card">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>团购公司购买记录</h2>
        {purchases.length === 0 ? (
          <p className="text-gray text-sm">暂无购买记录。</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>公司名称</th><th>部门</th><th>联系人</th><th>电话</th>
                  <th>数量</th><th>车位号</th><th>金额</th><th>付款</th><th>发票</th><th>登记时间</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.purchase_id}>
                    <td>{p.company_name}</td>
                    <td>{p.department || '-'}</td>
                    <td>{p.contact_person || '-'}</td>
                    <td>{p.contact_phone || '-'}</td>
                    <td>{p.space_count}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.space_list}>
                      {p.space_list || '-'}
                    </td>
                    <td>¥{Number(p.amount).toLocaleString()}</td>
                    <td>{p.is_paid ? '✅已付' : '⏳未付'}</td>
                    <td>{p.invoice_type}</td>
                    <td>{new Date(p.created_at).toLocaleString('zh-CN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

function CompanyCard({
  company,
  unsoldCount,
}: {
  company: any
  unsoldCount: number
}) {
  return (
    <div style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 6 }}>
      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{company.company_name}</div>
          <div className="text-xs text-gray">
            {company.department} · {company.space_count} 个车位
            {company.is_paid ? ' · ✅已付款' : ' · ⏳未付款'}
          </div>
        </div>
        <div className="text-sm text-gray">¥{Number(company.total_price).toLocaleString()}</div>
      </div>
      <GroupBuyPanel company={company} />
      <PurchasePanel company={company} />
    </div>
  )
}
