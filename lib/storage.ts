// 统一图片存储门面：根据部署地址（NEXTAUTH_URL）自动选择存储后端。
//
//   NEXTAUTH_URL === 'http://parks.cc.cd'  -> 本地磁盘存储（应用服务器本机）
//   其他（如 Vercel / 自有域名）           -> Cloudflare R2 对象存储
//
// 上游（API 路由 / actions）只需调用 saveUpload / deleteUpload，无需关心具体后端，
// 因此同一套代码部署到哪里都能自动适配，无需修改业务代码。

import { randomUUID } from 'crypto'
import { saveBuffer, extFromMime, deleteByUrl } from './local-storage'
import { uploadToR2, deleteFromR2, keyFromUrl, getPublicUrl } from './object-storage'

// 使用本地磁盘存储的判定地址（私有化部署在应用服务器本机时使用）
const LOCAL_AUTH_URL = 'http://parks.cc.cd'

// 每次调用时实时判断，避免模块加载期环境变量未就绪导致误判
export function isLocalStorage(): boolean {
  return (process.env.NEXTAUTH_URL || '').trim() === LOCAL_AUTH_URL
}

// 业务侧常量的便捷导出（mime 映射与存储后端无关，统一从这里取）
export { extFromMime }

function extToContentType(ext: string): string {
  const e = ext.toLowerCase()
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg'
  if (e === '.png') return 'image/png'
  if (e === '.webp') return 'image/webp'
  if (e === '.gif') return 'image/gif'
  return 'application/octet-stream'
}

/**
 * 保存上传的图片 Buffer，返回可公开访问的 URL。
 * - 本地模式：返回 /api/files/... 形式的本地 URL
 * - R2 模式：上传到 R2 并返回公网 URL
 */
export async function saveUpload(subDir: string, buffer: Buffer, ext?: string): Promise<string> {
  if (isLocalStorage()) {
    return saveBuffer(subDir, buffer, ext)
  }
  const finalExt = (ext && ext.startsWith('.') ? ext : ext ? '.' + ext : '.png').toLowerCase()
  const key = `uploads/${subDir}/${randomUUID()}${finalExt}`
  await uploadToR2(key, buffer, extToContentType(finalExt))
  return getPublicUrl(key)
}

/**
 * 删除旧图（替换图片时调用），自动识别本地 / R2 存储。
 */
export async function deleteUpload(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl) return
  if (isLocalStorage()) {
    deleteByUrl(publicUrl)
    return
  }
  const key = keyFromUrl(publicUrl)
  if (key) await deleteFromR2(key)
}
