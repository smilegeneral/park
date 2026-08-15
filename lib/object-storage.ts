import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// ============ Cloudflare R2 对象存储（S3 兼容，公开读） ============
// 所需环境变量（在 Vercel 项目设置 / .env.local 中配置）：
//   R2_ACCOUNT_ID         - Cloudflare 账户 ID
//   R2_ACCESS_KEY_ID      - R2 API 访问密钥 ID
//   R2_SECRET_ACCESS_KEY  - R2 API 密钥
//   R2_BUCKET             - 存储桶名称（需设为公开读）
//   R2_PUBLIC_URL         - 公开访问基础 URL，如 https://cdn.example.com 或 https://<id>.r2.cloudflarestorage.com/<bucket>
// 公开读配置：桶 → Settings → 开启 "Allow Access from the Internet (Public)" 并设置自定义域或公开 URL。

let _client: S3Client | null = null

function getClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 未配置：请在环境变量中设置 R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY')
  }
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  }
  return _client
}

export function getPublicUrl(key: string): string {
  const base = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '')
  if (!base) throw new Error('R2 未配置：请设置 R2_PUBLIC_URL（公开访问基础 URL）')
  return `${base}/${key}`
}

// 生成前端直传 R2 的 presigned PUT URL（Vercel 函数体仅返回签名，不经过大文件）
// 这样可绕过 Vercel 对请求体 ~4.5MB 的限制，图片由浏览器直接 PUT 到 R2。
export async function getPresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn = 600
): Promise<string> {
  const bucket = process.env.R2_BUCKET
  if (!bucket) throw new Error('R2 未配置：请设置 R2_BUCKET')
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  })
  return await getSignedUrl(getClient(), cmd, { expiresIn })
}

// 上传文件流/Buffer 到 R2，返回对象 key（不含 base URL）
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | Blob,
  contentType: string
): Promise<string> {
  const bucket = process.env.R2_BUCKET
  if (!bucket) throw new Error('R2 未配置：请设置 R2_BUCKET')
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return key
}

// 删除 R2 对象（替换图片时调用）
export async function deleteFromR2(key: string): Promise<void> {
  const bucket = process.env.R2_BUCKET
  if (!bucket) return
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key })
    )
  } catch {
    // 删除失败不阻断主流程
  }
}

// 从公开 URL 中解析出 key（用于删除旧图）
export function keyFromUrl(url: string): string | null {
  const base = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '')
  if (base && url.startsWith(base + '/')) {
    return url.slice(base.length + 1)
  }
  // 兜底：取最后一段路径
  try {
    const u = new URL(url)
    return decodeURIComponent(u.pathname.replace(/^\//, ''))
  } catch {
    return null
  }
}
