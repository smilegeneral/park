import { getAllSpaces } from '@/lib/queries'
import SwapForm from './swap-form'
import Link from 'next/link'

// ============================================================
//  车位调换页 - 选择原车位和新车位，填写差价与原因
// ============================================================

export default async function SwapPage() {
  const all = await getAllSpaces()
  const available = all.filter(s => s.status === '未售')

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
      <header className="flex mb-4" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>🔄 车位调换</h1>
          <p className="text-sm text-gray">输入房号带出业主，选择名下旧车位，再选/填新车位</p>
        </div>
        <Link href="/dashboard" style={{ fontSize: 14 }}>← 返回</Link>
      </header>

      <section className="card mb-4">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>发起调换</h2>
        <SwapForm availableSpaces={available} />
      </section>

      <section className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card">
          <div className="text-sm text-gray mb-2">已售/已核销车位（可换出）</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>
            {all.filter(s => s.status === '已售' || s.status === '已核销').length}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray mb-2">未售车位（可换入）</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>{available.length}</div>
        </div>
      </section>
    </main>
  )
}
