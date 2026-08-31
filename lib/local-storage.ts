// 本地对象存储工具：替代 R2，将图片保存在应用服务器磁盘上。
// 文件统一存放在项目根下的 data/uploads 目录，通过一个公开的 HTTP 路由 /api/files/... 访问。
//
// 这样无需任何外部对象存储（R2/S3），适合私有化部署在应用服务器本机。

import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// 上传根目录（绝对路径，位于项目根 data/uploads）
export const UPLOAD_ROOT = path.join(process.cwd(), 'data', 'uploads')

// 公开访问前缀，与 app/api/files/[...path]/route.ts 对应
export const FILES_PUBLIC_PREFIX = '/api/files/'

// 允许保存的图片类型
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const MAX_BYTES = 8 * 1024 * 1024 // 8MB 上限（本地存储可放宽 Vercel 4.5MB 限制）

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function sanitizeFileName(name: string): string {
  // 仅保留安全字符，避免路径穿越
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60)
}

/**
 * 保存一个 Buffer 到本地磁盘。
 * @param subDir   子目录（如 'garage-maps' / 'space-plates' / 'change-log-plates'）
 * @param buffer   文件内容
 * @param ext      扩展名（含点，如 '.png'），为空时从 mime 推断
 * @returns        公开访问 URL（如 /api/files/garage-maps/xxx.png）
 */
export function saveBuffer(subDir: string, buffer: Buffer, ext?: string): string {
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error('文件过大，本地存储上限 8MB')
  }
  const finalExt = (ext || '').toLowerCase()
  if (!ALLOWED_EXT.has(finalExt)) {
    throw new Error('仅支持图片类型 png/jpg/webp/gif')
  }
  const dir = path.join(UPLOAD_ROOT, subDir)
  ensureDir(dir)
  const fileName = `${randomUUID()}${finalExt}`
  const filePath = path.join(dir, fileName)
  fs.writeFileSync(filePath, buffer)
  return FILES_PUBLIC_PREFIX + path.posix.join(subDir, fileName)
}

/** 根据公开 URL 删除对应本地文件（URL 非法或文件不存在时静默忽略） */
export function deleteByUrl(publicUrl: string | null | undefined): void {
  if (!publicUrl) return
  if (!publicUrl.startsWith(FILES_PUBLIC_PREFIX)) return // 只处理本地文件
  const rel = decodeURIComponent(publicUrl.slice(FILES_PUBLIC_PREFIX.length))
  // 防止路径穿越
  const safeRel = rel.replace(/\\/g, '/').replace(/\.\./g, '')
  const filePath = path.join(UPLOAD_ROOT, safeRel)
  if (!filePath.startsWith(UPLOAD_ROOT)) return
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch {
    // 删除失败不影响主流程
  }
}

/** 从公开 URL 解析出本地绝对路径（供静态路由读取） */
export function resolveLocalPath(publicUrl: string): string | null {
  if (!publicUrl.startsWith(FILES_PUBLIC_PREFIX)) return null
  const rel = decodeURIComponent(publicUrl.slice(FILES_PUBLIC_PREFIX.length))
  const safeRel = rel.replace(/\\/g, '/').replace(/\.\./g, '')
  const filePath = path.join(UPLOAD_ROOT, safeRel)
  if (!filePath.startsWith(UPLOAD_ROOT)) return null
  return filePath
}

export function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/png':
      return '.png'
    case 'image/jpeg':
      return '.jpg'
    case 'image/webp':
      return '.webp'
    case 'image/gif':
      return '.gif'
    default:
      return ''
  }
}

export { sanitizeFileName }
