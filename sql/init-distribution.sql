-- ============================================================
--  车位分布图：车库图片表 + 访客账号
--  在 Aiven SQL Editor 中执行
-- ============================================================

-- ---------- 车库分布图（每个区一张图片，base64 存储） ----------
CREATE TABLE IF NOT EXISTS garage_maps (
  id SERIAL PRIMARY KEY,
  zone VARCHAR(20) UNIQUE NOT NULL,   -- A区/B区/C区/D1区/D2区/E区
  image_url VARCHAR(512),             -- 对象存储公开 URL（R2）
  image_name VARCHAR(100),            -- 原始文件名
  uploaded_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ---------- 访客账号（role=0，仅可查看车位分布图） ----------
-- bcryptjs hash of "111111" (cost 10)，已实测验证可登录
INSERT INTO admin_user (username, password_hash, role, display_name)
VALUES (
  'guest',
  '$2a$10$4eF8cCv3px5utBHj5V59reAJjhYJAV9zgtCdX1II0tGJiz9lvHH7u'  -- 对应明文 111111
  , 0, -- 0=访客（只读车位分布图）
  '访客'
)
ON CONFLICT (username) DO NOTHING;
