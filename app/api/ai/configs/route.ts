import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEnabledAiConfigs } from '@/lib/queries'
import { isAiConfigured, envProviderInfo } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/ai/configs —— AI 查询窗口的下拉选项（只返回启用的配置，且不含任何密钥）
export async function GET() {
  const session = await getServerSession(authOptions)
  const role = Number((session?.user as any)?.role ?? 0)
  if (!session?.user || role < 2) {
    return NextResponse.json({ ok: false, error: '未授权' }, { status: 401 })
  }

  try {
    const configs = await getEnabledAiConfigs()
    return NextResponse.json({
      ok: true,
      configs,
      // 数据库无配置时，前端展示环境变量兜底选项
      envFallback: isAiConfigured() ? envProviderInfo() : null,
    })
  } catch (err) {
    console.error('[ai/configs] failed:', err)
    return NextResponse.json(
      { ok: false, error: '读取 AI 配置失败（若未执行 sql/init-ai-config.sql 请先执行）' },
      { status: 500 }
    )
  }
}
