-- ============================================================
--  邮箱验证码双因素认证（2FA）数据库迁移
--  在 Aiven / 生产库 SQL Editor 中执行（幂等，可重复运行）
-- ============================================================

-- 1) admin_user 增加 email 字段（绑定邮箱后登录需邮箱验证码）
ALTER TABLE admin_user ADD COLUMN IF NOT EXISTS email VARCHAR(120);
-- 邮箱唯一（允许空值：未绑定邮箱的账号不启用 2FA）
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_user_email
  ON admin_user (email) WHERE email IS NOT NULL;

-- 2) 邮箱验证码临时表（验证码 + 过期时间，一次性消费）
CREATE TABLE IF NOT EXISTS email_otp (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL,
  code        TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_otp_email ON email_otp (email);

-- 3) 复核
-- SELECT id, username, email FROM admin_user;
-- SELECT count(*) FROM email_otp;
