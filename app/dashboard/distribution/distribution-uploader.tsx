'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadGarageMap } from '@/lib/actions'
import { GARAGE_ZONES } from '@/lib/types'

export default function DistributionUploader({
  zone,
  currentName,
}: {
  zone: string
  currentName?: string | null
}) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const router = useRouter()

  async function handleUpload() {
    if (!file) {
      setMsg('请先选择图片')
      return
    }
    setLoading(true)
    setMsg('')
    try {
      // 1) 把文件直接 POST 到应用服务器，由服务端保存到本地磁盘
      const fd = new FormData()
      fd.append('file', file)
      fd.append('zone', zone)
      const meta = await fetch('/api/upload', { method: 'POST', body: fd })
      const metaRes = await meta.json()
      if (!metaRes.ok || !metaRes.imageUrl) {
        throw new Error(metaRes.error || '上传失败')
      }

      // 2) 把本地图片 URL 写入车库台账
      const res = await uploadGarageMap({
        zone,
        image_url: metaRes.imageUrl,
        image_name: file.name,
        uploaded_by: undefined,
      })
      if (res?.ok) {
        setMsg('上传成功')
        setFile(null)
        router.refresh()
      } else {
        setMsg('保存失败')
      }
    } catch (e: any) {
      setMsg(e?.message || '上传失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={e => setFile(e.target.files?.[0] || null)}
        className="text-sm"
      />
      <button
        type="button"
        className="btn-primary"
        style={{ padding: '6px 14px', fontSize: 14 }}
        onClick={handleUpload}
        disabled={loading}
      >
        {loading ? '上传中...' : '上传/替换图片'}
      </button>
      {currentName && <span className="text-xs text-gray">当前：{currentName}</span>}
      {msg && <span className="text-sm" style={{ color: msg.includes('成功') ? '#16a34a' : '#dc2626' }}>{msg}</span>}
    </div>
  )
}
