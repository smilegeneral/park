'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { markChangeLogPlateUploaded } from '@/lib/actions'

export default function ChangeLogPlateUploader({
  logId,
  spaceNo,
}: {
  logId: number
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
      const meta = await fetch('/api/upload-space-plate-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId,
          fileType: file.type,
          fileSize: file.size,
        }),
      })
      const metaRes = await meta.json()
      if (!meta.ok || !metaRes.uploadUrl) {
        throw new Error(metaRes.error || '获取上传地址失败')
      }

      const putRes = await fetch(metaRes.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!putRes.ok) {
        throw new Error(`直传 R2 失败（${putRes.status}）`)
      }

      const res = await markChangeLogPlateUploaded({
        log_id: logId,
        image_url: metaRes.publicUrl,
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
