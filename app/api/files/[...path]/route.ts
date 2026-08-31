import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { resolveLocalPath, FILES_PUBLIC_PREFIX } from '@/lib/local-storage'

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

// 提供本地存储的图片访问：/api/files/<subDir>/<fileName>
export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // 构造完整公开 URL（含 /api/files/ 前缀）再交给 resolveLocalPath 解析
  const publicUrl = FILES_PUBLIC_PREFIX + (params.path || []).join('/')
  const filePath = resolveLocalPath(publicUrl)
  if (!filePath || !fs.existsSync(filePath)) {
    return new NextResponse('Not Found', { status: 404 })
  }
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
  const mime = MIME[ext] || 'application/octet-stream'
  const data = fs.readFileSync(filePath)
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
