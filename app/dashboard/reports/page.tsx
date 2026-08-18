import {
  getReportSummary,
  getUnsoldByZone,
  getTopOwners,
  getOwnersNotBought,
} from '@/lib/queries'
import ReportClient from './report-client'

// 该页需在请求时查库，禁止构建期静态预渲染
export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const [summary, unsoldByZone, topOwners, notBought] = await Promise.all([
    getReportSummary(),
    getUnsoldByZone(),
    getTopOwners(20),
    getOwnersNotBought(),
  ])

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>📊 统计报表</h1>
          <p className="text-sm text-gray">车位销售与业主维度常用统计</p>
        </div>
      </header>

      <ReportClient
        summary={summary}
        unsoldByZone={unsoldByZone}
        topOwners={topOwners}
        notBought={notBought}
      />
    </main>
  )
}
