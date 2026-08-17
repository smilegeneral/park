'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20 }}>页面加载出错</h1>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          background: '#f5f5f5',
          padding: 14,
          borderRadius: 8,
          fontSize: 13,
          color: '#c0392b',
        }}
      >
        {error?.message || '未知错误'}
      </pre>
      {error?.digest && (
        <p style={{ color: '#888', fontSize: 12 }}>digest: {error.digest}</p>
      )}
      <button
        onClick={reset}
        style={{ marginTop: 14, padding: '8px 16px', fontSize: 14, cursor: 'pointer' }}
      >
        重试
      </button>
    </div>
  )
}
