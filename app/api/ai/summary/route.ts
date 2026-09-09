import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { chat, type AiRuntimeConfig } from '@/lib/ai'
import { loadAiRuntimeConfig } from '@/lib/ai-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/ai/summary —— 对已查到的数据做中文解读。
// 独立成接口的原因：与主查询同处一次请求会串联两次 AI 调用，
// 极易超出免费版函数时长上限；拆分后解读失败也不影响数据展示。
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = Number((session?.user as any)?.role ?? 0)
  if (!session?.user || role < 2) {
    return NextResponse.json({ ok: false, error: '未授权' }, { status: 401 })
  }

  let body: {
    question?: string
    sql?: string
    columns?: string[]
    rows?: any[]
    configId?: number | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: '请求体格式错误' }, { status: 400 })
  }

  const columns = Array.isArray(body.columns) ? body.columns : []
  const rows = Array.isArray(body.rows) ? body.rows : []

  let cfg: AiRuntimeConfig | undefined
  try {
    const loaded = await loadAiRuntimeConfig(body.configId ?? null)
    if (loaded) cfg = loaded.config
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 200 })
  }

  const sample = rows.slice(0, 30).map(r => {
    const o: Record<string, any> = {}
    columns.forEach(c => {
      o[c] = r[c]
    })
    return o
  })

  const prompt = `用户问题：${body.question || ''}

执行的 SQL：
${body.sql || ''}

查询结果（共 ${rows.length} 行，以下为前 ${sample.length} 行）：
${JSON.stringify(sample, null, 2)}

请用简洁的中文（2-4 句话）总结这个结果，直接给出关键数字和结论。不要复述 SQL，不要使用 Markdown 标题，可以用「；」分隔要点。如果结果为空，说明未查到符合条件的数据并给出可能原因。`

  try {
    const summary = await chat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 500, timeoutMs: 15_000 },
      cfg
    )
    return NextResponse.json({ ok: true, summary })
  } catch (e) {
    // 解读是可选项，失败不抛错，前端静默降级
    return NextResponse.json({ ok: false, error: (e as Error)?.message || '解读失败' }, { status: 200 })
  }
}
