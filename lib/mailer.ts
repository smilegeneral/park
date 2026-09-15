// lib/mailer.ts
// 通用 SMTP 邮件发送（nodemailer）。所有变量从环境变量读取，
// 支持 QQ/163 企业邮、阿里云/腾讯云邮件推送等任意 SMTP 服务。
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

let cached: Transporter | null = null

function getTransporter(): Transporter {
  if (cached) return cached
  const host = process.env.SMTP_HOST
  if (!host) {
    throw new Error('未配置 SMTP_HOST，无法发送邮件')
  }
  const port = Number(process.env.SMTP_PORT || 465)
  cached = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  })
  return cached
}

export function isMailConfigured(): boolean {
  return !!process.env.SMTP_HOST
}

// 发送登录验证码邮件
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const transporter = getTransporter()
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || ''
  const appName = '车位管理系统'
  await transporter.sendMail({
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
  })
}
