import {
  getAllGroupCompanies,
  getSpacesByStatus,
  getGroupBuyPurchases,
  getGroupBuyStats,
  getGroupBuyStatsDetail,
  getUnsoldSpacesForGroupBuy,
  getGroupBuyVerifyDetails,
} from '@/lib/queries'
import GroupBuyPanel from './group-buy-panel'
import VerifyPanel from './verify-panel'
import PurchasePanel from './purchase-panel'
import StatsPanel from './stats-panel'
import Link from 'next/link'

// ============================================================
//  团购管理 - 团购下单 + 公司购买 + 核销转业主 + 调换
// ============================================================

export const dynamic = 'force-dynamic'

export default async function GroupBuyPage() {
  const [companies, unsold, purchases, statsByDept, statsByCompany, locked, verifyDetails] =
    await Promise.all([
      getAllGroupCompanies(),
      getUnsoldSpacesForGroupBuy(),
      getGroupBuyPurchases(),
      getGroupBuyStats('department'),
      getGroupBuyStats('company'),
      getSpacesByStatus('团购锁定'),
      getGroupBuyVerifyDetails(),
    ])

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>🏢 团购管理</h1>
          <p className="text-sm text-gray">团购公司批量购车位 → 车位调换 → 逐个核销转给业主</p>
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

      {/* 团购统计（下拉筛选 + 明细） */}
      <section className="card mb-4">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>团购统计</h2>
        <StatsPanel
          byDept={statsByDept}
          byCompany={statsByCompany}
          getDetail={async (mode, dimKey) => getGroupBuyStatsDetail(mode, dimKey)}
        />
      </section>

      {/* 团购公司购买登记 */}
      <section className="card mb-4">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>团购公司购买登记</h2>
        <PurchasePanel companies={companies} unsold={unsold} />
      </section>

      {/* 团购公司列表 + 下单 */}
      <section className="card mb-4">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>团购公司 / 车位下单</h2>
        {companies.length === 0 ? (
          <p className="text-gray text-sm">暂无团购公司，请先通过上方"团购公司购买登记"新建。</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {companies.map((c) => (
              <CompanyCard key={c.company_id} company={c} unsoldCount={unsold.length} companies={companies} unsold={unsold} />
            ))}
          </div>
        )}
      </section>

      {/* 团购车位调换 */}
      <section className="card mb-4">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>团购车位调换</h2>
        <GroupBuyPanel companies={companies} />
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
      <section className="card mb-4">
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
                {purchases.map((p) => (
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
                    <td>{fmtTime(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 团购核销明细 */}
      <section className="card">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>团购核销明细</h2>
        {verifyDetails.length === 0 ? (
          <p className="text-gray text-sm">暂无核销明细记录。</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>团购公司</th><th>车位号</th><th>业主</th><th>房号</th><th>销售金额</th>
                  <th>确认单号</th><th>核销日期</th><th>经办人</th>
                </tr>
              </thead>
              <tbody>
                {verifyDetails.map((v) => (
                  <tr key={v.verify_id}>
                    <td>{v.company_name || '-'}</td>
                    <td>{v.space_id || '-'}</td>
                    <td>{v.owner_name || '-'}</td>
                    <td>{v.house_key || '-'}</td>
                    <td>¥{Number(v.sale_amount).toLocaleString()}</td>
                    <td>{v.receipt_no || '-'}</td>
                    <td>{v.verify_date ? String(v.verify_date).slice(0, 10) : fmtTime(v.created_at).slice(0, 10)}</td>
                    <td>{v.operator || '-'}</td>
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

function CompanyCard({
  company,
  unsoldCount,
  companies,
  unsold,
}: {
  company: any
  unsoldCount: number
  companies: any[]
  unsold: any[]
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
      <GroupBuyPanel companies={companies} company={company} />
      <PurchasePanel companies={companies} unsold={unsold} company={company} />
    </div>
  )
}
