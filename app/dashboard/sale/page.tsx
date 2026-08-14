import Link from 'next/link'
import SaleLookup from './sale-lookup'

// ============================================================
//  车位销售页
//  流程：输入车位号 → 系统查询状态
//   - 未售 / 预订 → 进入填写步骤（预订自动带出预订人信息）
//   - 其他状态   → 提示「车位不可售」
// ============================================================

export default function SalePage() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>💰 车位销售</h1>
          <p className="text-sm text-gray">
            输入车位号查询：未售 / 预订 可继续销售；其他状态不可售
          </p>
        </div>
        <Link href="/dashboard" style={{ fontSize: 14 }}>← 返回</Link>
      </header>

      <section className="card mb-4" style={{ padding: 16 }}>
        <SaleLookup />
      </section>
    </main>
  )
}
