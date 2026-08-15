import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadToR2, getPublicUrl } from '@/lib/object-storage'

// 车位分布图仅支持六个分区
const GARAGE_MAP_ZONES = ['A区', 'B区', 'C区', 'D1区', 'D2区', 'E区']
// 单图上限 10MB（R2 上传，不再受 serverActions.bodySizeLimit 限制）
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

function bufferFromReadable(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (c) => chunks.push(Buffer.from(c)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

export async function POST(req: NextRequest) {
  try {
    // 权限校验：仅管理员(role>=2)可上传
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 })
    const role = (session.user as any)?.role ?? 1
    if (role < 2) return NextResponse.json({ ok: false, error: '无权限' }, { status: 403 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    const zone = (form.get('zone') as string) || ''
    if (!GARAGE_MAP_ZONES.includes(zone)) {
      return NextResponse.json({ ok: false, error: '车库分区不合法' }, { status: 400 })
    }
    if (!file) return NextResponse.json({ ok: false, error: '请选择图片' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ ok: false, error: '仅支持 PNG/JPG/WEBP 图片' }, { status: 400 })
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: '图片过大，请控制在 10MB 以内' }, { status: 400 })
    }

    const buf = await bufferFromReadable(file.stream() as unknown as NodeJS.ReadableStream)
    // key：garage-maps/{zone}.{ext}
    const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
    const key = `garage-maps/${zone}.${ext}`
    await uploadToR2(key, buf, file.type)

    return NextResponse.json({ ok: true, url: getPublicUrl(key), key })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '上传失败' }, { status: 500 })
  }
}
