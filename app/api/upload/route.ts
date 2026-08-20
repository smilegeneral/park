import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPresignedPutUrl, getPublicUrl } from '@/lib/object-storage'

// 车位分布图仅支持六个分区
const GARAGE_MAP_ZONES = ['A区', 'B区', 'C区', 'D1区', 'D2区', 'E区']
// 前端直传 R2，单图上限 10MB（在前端校验，R2 本身支持更大）
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

// 仅签发 presigned PUT URL，不接收文件体（绕过 Vercel ~4.5MB 请求体限制）
export async function POST(req: NextRequest) {
  try {
    // 权限校验：仅管理员(role>=2)可上传
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 })
    const role = (session.user as any)?.role ?? 1
    if (role < 2) return NextResponse.json({ ok: false, error: '无权限' }, { status: 403 })

    const { zone, fileType, fileSize } = await req.json()
    if (!GARAGE_MAP_ZONES.includes(zone)) {
      return NextResponse.json({ ok: false, error: '车库分区不合法' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json({ ok: false, error: '仅支持 PNG/JPG/WEBP 图片' }, { status: 400 })
    }
    if (fileSize > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: '图片过大，请控制在 10MB 以内' }, { status: 400 })
    }

    const ext = (fileType.split('/')[1] || 'png').replace('jpeg', 'jpg')
    // 每次上传使用唯一 key（含时间戳），避免覆盖同一 URL 导致 CDN/浏览器缓存旧图
    const key = `garage-maps/${zone}-${Date.now()}.${ext}`
    const uploadUrl = await getPresignedPutUrl(key, fileType)
    // 直传成功后浏览器将使用此公开 URL 写库
    const publicUrl = getPublicUrl(key)

    return NextResponse.json({ ok: true, uploadUrl, publicUrl, key })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '获取上传地址失败' }, { status: 500 })
  }
}
