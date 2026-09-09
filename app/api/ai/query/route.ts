import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { chat, extractSql, isAiConfigured, type ChatMessage, type AiRuntimeConfig } from '@/lib/ai'
import { loadAiRuntimeConfig } from '@/lib/ai-config'
import { AI_SCHEMA_DOC } from '@/lib/ai-schema'
import { validateSelectSql } from '@/lib/ai-guard'

// pg 需要 Node.js 运行时
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATEMENT_TIMEOUT_MS = 8000

// 简易限流：免费 AI 额度有限，防止被刷（单实例内存计数）
const RATE_LIMIT = { windowMs: 60_000, max: 20 }
const hitLog = new Map<string, number[]>()

function rateLimited(key: string): boolean {
  const now = Date.now()
  const hits = (hitLog.get(key) || []).filter(t => now - t < RATE_LIMIT.windowMs)
  if (hits.length >= RATE_LIMIT.max) {
    hitLog.set(key, hits)
    return true
  }
  hits.push(now)
  hitLog.set(key, hits)
  return false
}

type HistoryItem = { role: 'user' | 'assistant'; content: string }

/** 让 AI 把自然语言问题转成 SQL */
async function generateSql(
  question: string,
  history: HistoryItem[],
  cfg: AiRuntimeConfig | undefined,
  errorHint?: string
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: AI_SCHEMA_DOC },
    // 只带最近 6 轮上下文，控制 token 消耗
    ...history.slice(-6).map(h => ({ role: h.role, content: h.content }) as ChatMessage),
    { role: 'user', content: question },
  ]
  if (errorHint) {
    messages.push({
      role: 'user',
      content: `上一条 SQL 执行失败或被安全策略拒绝，原因：${errorHint}\n请修正后只重新输出一条 SQL。`,
    })
  }
  // SQL 一般很短，限制输出长度可明显缩短推理耗时
  const raw = await chat(messages, { temperature: 0, maxTokens: 700 }, cfg)
  return extractSql(raw)
}

/** 在只读事务中执行 SQL，数据库层面杜绝写操作 */
async function runReadOnly(sql: string) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SET TRANSACTION READ ONLY')
    await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`)
    const res = await client.query(sql)
    await client.query('COMMIT')
    return res
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

// 说明：结果解读已拆到 /api/ai/summary 独立接口。
// 一次请求里串联两次 AI 调用（生成 SQL + 解读）很容易超出免费版函数时长上限，
// 被网关掐断后前端只会收到 HTML 错误页。拆分后主流程只保留一次 AI 调用。

export async function POST(req: NextRequest) {
  // 1) 鉴权：AI 可查全表数据，限定管理员（role >= 2）
  const session = await getServerSession(authOptions)
  const role = Number((session?.user as any)?.role ?? 0)
  if (!session?.user || role < 2) {
    return NextResponse.json({ ok: false, error: '未授权：仅管理员可使用 AI 问数' }, { status: 401 })
  }

  const username = String((session.user as any)?.username || (session.user as any)?.name || 'unknown')
  if (rateLimited(username)) {
    return NextResponse.json(
      { ok: false, error: `请求过于频繁，请稍后再试（每分钟最多 ${RATE_LIMIT.max} 次）` },
      { status: 429 }
    )
  }

  let body: { question?: string; history?: HistoryItem[]; configId?: number | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: '请求体格式错误' }, { status: 400 })
  }

  const question = (body.question || '').trim()
  if (!question) {
    return NextResponse.json({ ok: false, error: '请输入问题' }, { status: 400 })
  }
  if (question.length > 300) {
    return NextResponse.json({ ok: false, error: '问题过长（最多 300 字）' }, { status: 400 })
  }
  const history = Array.isArray(body.history) ? body.history.slice(-10) : []

  // 2) 装载所选 AI 配置（解密 Key）；未指定则用默认配置，仍无则回退环境变量
  let cfg: AiRuntimeConfig | undefined
  let usedAi: { id: number | null; name: string; provider: string; model: string; source: string } | null = null
  try {
    const loaded = await loadAiRuntimeConfig(body.configId ?? null)
    if (loaded) {
      cfg = loaded.config
      usedAi = {
        id: loaded.id,
        name: loaded.config.name || '未命名',
        provider: loaded.config.provider || '',
        model: loaded.config.model,
        source: loaded.source,
      }
    }
  } catch (err) {
    // 表不存在（未执行建表 SQL）或 Key 解密失败，都给出可操作提示
    console.error('[ai/query] load config failed:', err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }

  if (!cfg && !isAiConfigured()) {
    return NextResponse.json(
      { ok: false, error: '未配置 AI：请在「用户与角色 → AI 配置」中添加，或设置环境变量 AI_API_KEY' },
      { status: 503 }
    )
  }

  try {
    // 3) 生成 SQL
    let sql = await generateSql(question, history, cfg)

    // 4) 安全校验
    let guard = validateSelectSql(sql)
    if (!guard.ok) {
      // 带拒绝原因让 AI 重试一次
      sql = await generateSql(question, history, cfg, guard.reason)
      guard = validateSelectSql(sql)
      if (!guard.ok) {
        return NextResponse.json({
          ok: false,
          error: `AI 生成的 SQL 未通过安全检查：${guard.reason}`,
          sql,
        })
      }
    }

    // 5) 只读执行
    let res
    try {
      res = await runReadOnly(guard.sql)
    } catch (dbErr) {
      // 执行报错时让 AI 修正一次
      const msg = (dbErr as Error)?.message || String(dbErr)
      const fixed = await generateSql(question, history, cfg, `数据库报错：${msg}`)
      const fixedGuard = validateSelectSql(fixed)
      if (!fixedGuard.ok) {
        return NextResponse.json({ ok: false, error: `SQL 执行失败：${msg}`, sql: guard.sql })
      }
      res = await runReadOnly(fixedGuard.sql)
      guard = fixedGuard
    }

    const columns = (res.fields || []).map((f: any) => String(f.name))
    const rows = res.rows || []

    return NextResponse.json({
      ok: true,
      sql: guard.sql,
      columns,
      rows,
      rowCount: rows.length,
      ai: usedAi,
    })
  } catch (err) {
    console.error('[ai/query] failed:', err)
    const msg = (err as Error)?.message || 'AI 查询失败'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
