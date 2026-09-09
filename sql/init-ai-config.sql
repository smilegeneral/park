-- ============ AI 配置表（统计报表「AI 智能问数」使用） ============
-- 执行方式：在 Aiven Console → SQL Editor 中执行本文件（可重复执行）
--
-- 设计要点：
--   1) API Key 以 AES-256-GCM 密文存储（api_key_enc），明文永不落库；
--   2) 列表只展示 api_key_hint（脱敏，如 gsk_ab****3fA2），前端拿不到明文；
--   3) is_default 标记查询窗口默认选中的 AI；enabled 控制是否可选。

CREATE TABLE IF NOT EXISTS ai_config (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(50)  UNIQUE NOT NULL,   -- AI 名称，自定义，前端下拉展示
  provider     VARCHAR(30)  NOT NULL DEFAULT 'groq',
  api_key_enc  TEXT         NOT NULL,          -- AES-256-GCM 密文（格式：iv.tag.data，均 base64）
  api_key_hint VARCHAR(24),                    -- 脱敏展示
  base_url     VARCHAR(255),                   -- 可选：覆盖服务商预设端点
  model        VARCHAR(80),                    -- 可选：覆盖服务商预设模型
  is_default   BOOLEAN      DEFAULT FALSE,     -- 查询窗口默认选中
  enabled      BOOLEAN      DEFAULT TRUE,      -- 是否启用（停用后下拉不再显示）
  created_by   VARCHAR(50),
  created_at   TIMESTAMP    DEFAULT NOW(),
  updated_at   TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_config_enabled ON ai_config(enabled);

COMMENT ON TABLE  ai_config              IS 'AI 服务商配置（名称 + 加密 API Key）';
COMMENT ON COLUMN ai_config.name         IS 'AI 名称（用户自定义，如"主力 Groq"）';
COMMENT ON COLUMN ai_config.provider     IS '服务商：groq/gemini/siliconflow/deepseek/openai';
COMMENT ON COLUMN ai_config.api_key_enc  IS 'AES-256-GCM 加密后的 API Key';
COMMENT ON COLUMN ai_config.api_key_hint IS '脱敏后的 Key 片段，仅用于展示';
COMMENT ON COLUMN ai_config.is_default   IS '是否为查询窗口默认选中的 AI';
