// lib/mailer.ts
// 通过 Resend HTTP API 发送邮件（无需开放 SMTP 端口，对 Vercel serverless 最友好）。
// 文档：https://resend.com/docs/api-reference/emails/send-email
// 仅需两个环境变量：RESEND_API_KEY（必填）、RESEND_FROM（发件地址）。
const RESEND_API_URL = 'https://api.resend.com/emails'

export function isMailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

// 发送登录验证码邮件
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('未配置 RESEND_API_KEY，无法发送邮件')
  }
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev'
  const appName = '车位管理系统'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)

  let res: Response
  try {
    res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: `[${appName}] 您的登录验证码`,
        text: `您的登录验证码为：${code}，5 分钟内有效。如非本人操作，请忽略本邮件。`,
        html: `
      <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;background:#fff;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#1677ff;margin:0 0 16px">${appName}</h2>
        <p style="font-size:14px;color:#333">您好，您正在登录系统，本次登录验证码为：</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:4px;color:#1677ff;margin:12px 0">${code}</div>
        <p style="font-size:13px;color:#888">验证码 5 分钟内有效。若非本人操作，请忽略本邮件，切勿将验证码告知他人。</p>
      </div>
    `,
      }),
      signal: controller.signal,
    })
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error('邮件服务连接超时（8s）')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    let detail = ''
    try {
      const err = await res.json()
      detail = err?.message || JSON.stringify(err)
    } catch {
      detail = await res.text()
    }
    throw new Error(`Resend 返回 ${res.status}: ${detail}`)
  }
}
