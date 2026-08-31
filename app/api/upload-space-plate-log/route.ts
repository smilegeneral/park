import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { saveBuffer, extFromMime } from '@/lib/local-storage'

// 调换日志车位牌照片上传：接收文件，保存到应用服务器本地磁盘
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    const logId = Number(form.get('logId'))

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: '缺少文件' }, { status: 400 })
    }
    if (!logId) {
      return NextResponse.json({ ok: false, error: '缺少日志ID' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = extFromMime(file.type)
    if (!ext) {
      return NextResponse.json({ ok: false, error: '仅支持图片类型' }, { status: 400 })
    }

    const imageUrl = saveBuffer('change-log-plates', buffer, ext)

    return NextResponse.json({ ok: true, imageUrl })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '上传失败' }, { status: 500 })
  }
}
