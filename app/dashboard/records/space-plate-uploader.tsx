'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { markSpacePlateUploaded } from '@/lib/actions'

export default function SpacePlateUploader({
  recordId,
  spaceNo,
}: {
  recordId: number
  spaceNo: string
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
      fd.append('recordId', String(recordId))
      const meta = await fetch('/api/upload-space-plate', { method: 'POST', body: fd })
      const metaRes = await meta.json()
      if (!metaRes.ok || !metaRes.imageUrl) {
        throw new Error(metaRes.error || '上传失败')
      }

      // 2) 回写销售记录：保存图片地址并把处理状态置为「已完成」
      const res = await markSpacePlateUploaded({
        record_id: recordId,
        image_url: metaRes.imageUrl,
      })
      if (res?.ok) {
        setMsg('上传成功，状态已更新为已完成')
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
        {loading ? '上传中...' : '上传车位牌照片'}
      </button>
      <span className="text-xs text-gray">车位号：{spaceNo}</span>
      {msg && (
        <span className="text-sm" style={{ color: msg.includes('成功') ? '#16a34a' : '#dc2626' }}>
          {msg}
        </span>
      )}
    </div>
  )
}
