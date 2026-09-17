// lib/mailer.ts
// 双引擎：优先使用 SMTP（QQ/163 等，已验证域名，可发任意收件人），
// 若未配置 SMTP 但配置了 RESEND_API_KEY，则走 Resend HTTP API。
// 选择逻辑：SMTP_HOST + SMTP_USER + SMTP_PASS 齐全 → SMTP；否则 RESEND_API_KEY 存在 → Resend。
import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT || 465)
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER || ''

const RESEND_API_URL = 'https://api.resend.com/emails'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev'

// Vercel serverless 默认 10s（Hobby）超时，用 Promise.race 兜底确保 5s 内返回，避免函数超时。
const EMAIL_SEND_TIMEOUT = 5000

function smtpConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS)
}
function resendConfigured(): boolean {
  return !!RESEND_API_KEY
}

export function isMailConfigured(): boolean {
  return smtpConfigured() || resendConfigured()
}

// 发送登录验证码邮件
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const appName = '车位管理系统'
  const subject = `[${appName}] 您的登录验证码`
  const text = `您的登录验证码为：${code}，5 分钟内有效。如非本人操作，请忽略本邮件。`
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;background:#fff;border:1px solid #eee;border-radius:8px">
      <h2 style="color:#1677ff;margin:0 0 16px">${appName}</h2>
      <p style="font-size:14px;color:#333">您好，您正在登录系统，本次登录验证码为：</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;color:#1677ff;margin:12px 0">${code}</div>
      <p style="font-size:13px;color:#888">验证码 5 分钟内有效。若非本人操作，请忽略本邮件，切勿将验证码告知他人。</p>
    </div>
  `

  // 1) SMTP 优先
  if (smtpConfigured()) {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: EMAIL_SEND_TIMEOUT,
      socketTimeout: EMAIL_SEND_TIMEOUT,
      // 连接阶段挂起时强制超时，避免 Vercel 函数被杀死（Cloudflare 502）
      greetingTimeout: EMAIL_SEND_TIMEOUT,
    })
    await transporter.sendMail({
      from: MAIL_FROM ? `${appName} <${MAIL_FROM}>` : SMTP_USER,
      to,
      subject,
      text,
      html,
    })
    return
  }

  // 2) Resend HTTP API
  if (resendConfigured()) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), EMAIL_SEND_TIMEOUT)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('邮件服务连接超时（5s）')), EMAIL_SEND_TIMEOUT)
    )
    let res: Response
    try {
      res = await Promise.race([
        fetch(RESEND_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from: RESEND_FROM, to, subject, text, html }),
          signal: controller.signal,
        }),
        timeoutPromise,
      ])
    } catch (e: any) {
      if (e?.name === 'AbortError' || /超时/.test(e?.message || '')) {
        throw new Error('邮件服务连接超时（5s）')
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
    return
  }

  throw new Error('邮件服务未配置（请配置 SMTP_* 或 RESEND_API_KEY）')
}
