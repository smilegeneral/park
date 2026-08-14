import { getPrintTemplates, searchSpaces } from '@/lib/queries'
import Link from 'next/link'
import PrintCenter from './print-center'

export default async function PrintPage() {
  const templates = await getPrintTemplates()
  // 提供一组示例查询数据用于打印预览（最多 30 条）
  const sample = await searchSpaces({}, 30)
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div className="flex" style={{ gap: 10, alignItems: 'center' }}>
          <Link href="/dashboard" className="btn-ghost" style={{ fontSize: 13 }}>← 返回</Link>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>🖨️ 表单打印</h1>
        </div>
      </header>
      <PrintCenter templates={templates} sampleData={sample} />
    </main>
  )
}
