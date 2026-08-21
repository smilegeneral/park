import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPresignedPutUrl, getPublicUrl } from '@/lib/object-storage'

// 车位牌照片仅支持图片，单图上限 10MB（前端也会校验）
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

// 仅签发 presigned PUT URL，不接收文件体（绕过 Vercel ~4.5MB 请求体限制）
export async function POST(req: NextRequest) {
  try {
    // 权限校验：销售员(role>=1)即可上传调换记录车位牌照片
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 })
    const role = (session.user as any)?.role ?? 0
    if (role < 1) return NextResponse.json({ ok: false, error: '无权限' }, { status: 403 })

    const { logId, fileType, fileSize } = await req.json()
    const lid = Number(logId)
    if (!lid || lid <= 0) {
      return NextResponse.json({ ok: false, error: '变更记录 ID 不合法' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json({ ok: false, error: '仅支持 PNG/JPG/WEBP 图片' }, { status: 400 })
    }
    if (fileSize > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: '图片过大，请控制在 10MB 以内' }, { status: 400 })
    }

    const ext = (fileType.split('/')[1] || 'png').replace('jpeg', 'jpg')
    const key = `space-plates-log/${lid}.${ext}`
    const uploadUrl = await getPresignedPutUrl(key, fileType)
    const publicUrl = getPublicUrl(key)

    return NextResponse.json({ ok: true, uploadUrl, publicUrl, key })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '获取上传地址失败' }, { status: 500 })
  }
}
