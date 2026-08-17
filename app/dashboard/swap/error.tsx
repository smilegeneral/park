'use client'

export default function SwapError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 820, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20 }}>车位调换出错</h1>
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
      <p style={{ fontSize: 12, color: '#888' }}>
        请将上方 message 与 digest 反馈，以便定位数据库或渲染问题。
      </p>
      <button
        onClick={reset}
        style={{ marginTop: 14, padding: '8px 16px', fontSize: 14, cursor: 'pointer' }}
      >
        重试
      </button>
    </div>
  )
}
