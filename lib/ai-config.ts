// ============ AI 配置装载（仅服务端） ============
// 负责读取 ai_config、解密 API Key，产出可直接调用的运行期凭证。
// 本模块会接触到明文 Key，禁止在任何客户端组件中引入。

import pool from './db'
import { decryptApiKey } from './ai-crypto'
import { presetOf } from './ai-presets'
import type { AiRuntimeConfig } from './ai'

export type LoadedAiConfig = {
  config: AiRuntimeConfig
  source: 'db' | 'env',
  /** 数据库配置 id，环境变量兜底时为 null */
  id: number | null
}

/**
 * 取得运行期凭证：
 *   1) 指定 id 且该配置启用 → 用它；
 *   2) 未指定 id → 用 is_default 且启用的配置；
 *   3) 都没有 → 返回 null，由调用方回退环境变量。
 */
export async function loadAiRuntimeConfig(id?: number | null): Promise<LoadedAiConfig | null> {
  const params: any[] = []
  let where = 'enabled = TRUE'

  if (id && Number(id) > 0) {
    params.push(Number(id))
    where += ` AND id = $${params.length}`
  } else {
    where += ' AND is_default = TRUE'
  }

  const { rows } = await pool.query(
    `SELECT id, name, provider, api_key_enc, base_url, model
     FROM ai_config WHERE ${where} ORDER BY id ASC LIMIT 1`,
    params
  )

  // 指定 id 没命中（可能被停用/删除）时，回退到默认配置
  if (rows.length === 0 && id && Number(id) > 0) {
    return loadAiRuntimeConfig(null)
  }
  if (rows.length === 0) return null

  const r = rows[0]
  let apiKey: string
  try {
    apiKey = decryptApiKey(r.api_key_enc)
  } catch (e) {
    // 加密密钥变更等导致无法解密时，给出可操作的提示
    throw new Error(
      `AI「${r.name}」的 Key 解密失败（请确认 AI_KEY_SECRET 未变更，必要时重新录入 Key）：${(e as Error).message}`
    )
  }

  const preset = presetOf(r.provider)
  return {
    id: Number(r.id),
    source: 'db',
    config: {
      name: r.name,
      provider: r.provider,
      apiKey,
      baseUrl: (r.base_url || preset?.baseUrl || '').replace(/\/+$/, ''),
      model: r.model || preset?.model || '',
    },
  }
}
