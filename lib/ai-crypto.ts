// ============ AI Key 加解密（AES-256-GCM） ============
// API Key 属于敏感凭据：数据库中只存密文，明文不落库、不返回前端。
// 主密钥取自环境变量 AI_KEY_SECRET，缺省回退 NEXTAUTH_SECRET。
// 注意：更换该环境变量后，历史密文将无法解密，需重新录入 Key。

import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12

function masterKey(): Buffer {
  const raw = process.env.AI_KEY_SECRET || process.env.NEXTAUTH_SECRET
  if (!raw) {
    throw new Error('缺少 AI_KEY_SECRET（或 NEXTAUTH_SECRET），无法加密/解密 AI Key')
  }
  // 任意长度口令 → 固定 32 字节密钥
  return crypto.createHash('sha256').update(raw).digest()
}

/** 加密，返回 iv.tag.data（三段 base64，用 . 连接） */
export function encryptApiKey(plain: string): string {
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, masterKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), enc.toString('base64')].join('.')
}

/** 解密；密文格式错误或密钥不匹配时抛错 */
export function decryptApiKey(payload: string): string {
  const parts = (payload || '').split('.')
  if (parts.length !== 3) throw new Error('AI Key 密文格式不正确')
  const decipher = crypto.createDecipheriv(ALGO, masterKey(), Buffer.from(parts[0], 'base64'))
  decipher.setAuthTag(Buffer.from(parts[1], 'base64'))
  const dec = Buffer.concat([decipher.update(Buffer.from(parts[2], 'base64')), decipher.final()])
  return dec.toString('utf8')
}

/** 脱敏展示：gsk_ab12****3fA2 */
export function maskApiKey(plain: string): string {
  const k = (plain || '').trim()
  if (!k) return ''
  if (k.length <= 8) return `${k.slice(0, 2)}****`
  return `${k.slice(0, 6)}****${k.slice(-4)}`
}

/** 当前是否具备加解密条件（未配置时保存应给出明确提示） */
export function canEncrypt(): boolean {
  return Boolean(process.env.AI_KEY_SECRET || process.env.NEXTAUTH_SECRET)
}
