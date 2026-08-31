import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { saveBuffer, extFromMime } from '@/lib/local-storage'

// 车库分布图上传：接收文件，保存到应用服务器本地磁盘，返回可访问的图片 URL
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: '缺少文件' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = extFromMime(file.type)
    if (!ext) {
      return NextResponse.json({ ok: false, error: '仅支持图片类型' }, { status: 400 })
    }

    const imageUrl = saveBuffer('garage-maps', buffer, ext)

    return NextResponse.json({ ok: true, imageUrl })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '上传失败' }, { status: 500 })
  }
}
