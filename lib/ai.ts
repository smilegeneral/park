// ============ AI 客户端（OpenAI Chat Completions 兼容协议，零依赖） ============
// 统一走 OpenAI 兼容协议，Groq / Gemini / 硅基流动 / DeepSeek / OpenAI 都能直接切换。
// 调用凭证可来自数据库 ai_config（解密后传入），也可回退到环境变量。

import { presetOf } from './ai-presets'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** 一次调用所需的运行期凭证（不含任何持久化信息） */
export type AiRuntimeConfig = {
  name?: string
  provider?: string
  apiKey: string
  baseUrl: string
  model: string
}

/** 环境变量配置（数据库无可用配置时的兜底） */
function resolveEnvConfig(): AiRuntimeConfig {
  const provider = (process.env.AI_PROVIDER || 'groq').toLowerCase()
  const preset = presetOf(provider)
  return {
    name: '环境变量配置',
    provider,
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: (process.env.AI_BASE_URL || preset?.baseUrl || '').replace(/\/+$/, ''),
    model: process.env.AI_MODEL || preset?.model || 'llama-3.3-70b-versatile',
  }
}

/** 是否已配置 AI（未配置时前端应友好提示而非报错） */
export function isAiConfigured(cfg?: Partial<AiRuntimeConfig>): boolean {
  if (cfg?.apiKey && cfg?.baseUrl) return true
  const env = resolveEnvConfig()
  return Boolean(env.apiKey && env.baseUrl)
}

/** 环境变量兜底配置的展示信息 */
export function envProviderInfo(): { name: string; provider: string; model: string } {
  const env = resolveEnvConfig()
  return { name: env.name || '环境变量配置', provider: env.provider || '', model: env.model }
}

export async function chat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; jsonMode?: boolean; timeoutMs?: number } = {},
  cfg?: AiRuntimeConfig
): Promise<string> {
  const c: AiRuntimeConfig = cfg && cfg.apiKey ? cfg : resolveEnvConfig()
  if (!c.apiKey || !c.baseUrl) {
    throw new Error('AI 未配置：请在「用户与角色 → AI 配置」中添加，或设置环境变量 AI_API_KEY')
  }

  // 必须设超时：AI 服务无响应时 fetch 会一直挂起，
  // 最终被平台网关掐断并返回 HTML 错误页，前端只能看到难以理解的解析报错。
  const timeoutMs = opts.timeoutMs ?? 25_000

  // Qwen3 / DeepSeek-R1 等推理模型默认先生成大量思考内容，响应耗时成倍上升，
  // 很容易触发 Vercel 免费版 10 秒函数上限，这里默认关闭思考模式。
  const mayThink = /qwen3|qwq|deepseek-r1|\br1\b|thinking/i.test(c.model)

  const send = async (disableThinking: boolean) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(`${c.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${c.apiKey}`,
        },
        body: JSON.stringify({
          model: c.model,
          messages,
          temperature: opts.temperature ?? 0,
          max_tokens: opts.maxTokens ?? 2048,
          ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
          ...(disableThinking ? { enable_thinking: false } : {}),
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
  }

  let res: Response
  try {
    res = await send(mayThink)
    // 少数服务端不认识 enable_thinking，返回 400 时去掉该参数重试一次
    if (!res.ok && mayThink && res.status === 400) {
      res = await send(false)
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') {
      throw new Error(
        `AI 响应超时（超过 ${Math.round(timeoutMs / 1000)} 秒）。Vercel 免费版函数上限为 10 秒，建议换用非推理模型（Qwen2.5-7B-Instruct 或 Groq）`
      )
    }
    throw new Error(`无法连接 AI 服务（${c.baseUrl}）：${(e as Error)?.message || String(e)}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`AI 服务返回 ${res.status}：${text.slice(0, 300)}`)
  }

  const data = (await res.json()) as any
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI 返回内容为空')
  }
  return content
}

/** 从模型输出中提取 ```sql 代码块或裸 SQL */
export function extractSql(raw: string): string {
  let s = (raw || '').trim()
  const fence = s.match(/```(?:sql)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  return s.replace(/^sql\s*/i, '').trim()
}

/** 从模型输出中提取 JSON（兼容 ```json 包裹与前后多余文字） */
export function extractJson<T = any>(raw: string): T | null {
  let s = (raw || '').trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) s = s.slice(start, end + 1)
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}
