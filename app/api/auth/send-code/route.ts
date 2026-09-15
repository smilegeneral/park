// app/api/auth/send-code/route.ts
// 第一步登录：校验账号密码，若已绑定邮箱则生成并发送 6 位验证码。
// 返回 { ok, twoFactor }：twoFactor=false 表示未绑定邮箱，前端直接密码登录。
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { sendOtpEmail, isMailConfigured } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ ok: false, error: '请输入账号和密码' }, { status: 400 })
    }

    const res = await pool.query(
      `SELECT id, username, password_hash, email FROM admin_user WHERE username = $1`,
      [username]
    )
    if (res.rowCount === 0) {
      return NextResponse.json({ ok: false, error: '账号或密码错误' }, { status: 401 })
    }
    const user = res.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ ok: false, error: '账号或密码错误' }, { status: 401 })
    }

    // 未绑定邮箱：不启用 2FA
    if (!user.email) {
      return NextResponse.json({ ok: true, twoFactor: false })
    }

    if (!isMailConfigured()) {
      return NextResponse.json(
        { ok: false, error: '邮件服务未配置，无法发送验证码，请联系管理员' },
        { status: 500 }
      )
    }

    // 生成 6 位验证码，有效期 5 分钟
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    // 同一邮箱只保留最新一条验证码
    await pool.query('DELETE FROM email_otp WHERE email = $1', [user.email])
    await pool.query(
      'INSERT INTO email_otp (email, code, expires_at) VALUES ($1, $2, $3)',
      [user.email, code, expiresAt]
    )

    try {
      await sendOtpEmail(user.email, code)
    } catch (mailErr: any) {
      console.error('[send-code] 邮件发送失败:', (mailErr as Error)?.message, mailErr?.code)
      return NextResponse.json(
        { ok: false, error: '验证码邮件发送失败：' + (mailErr?.message || String(mailErr)) },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true, twoFactor: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '服务器错误' }, { status: 500 })
  }
}
