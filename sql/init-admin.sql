-- ============================================================
--  初始化管理员账号 + 修正表结构（与 CSV 对齐）
--  在 Aiven SQL Editor 中执行
-- ============================================================

-- ---------- 管理员表 ----------
CREATE TABLE IF NOT EXISTS admin_user (
  id SERIAL PRIMARY KEY,
  username VARCHAR(30) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role SMALLINT DEFAULT 1,         -- 1=销售  2=管理员
  display_name VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 插入默认管理员 admin / 123456
-- bcryptjs hash of "123456" (cost 10)，已实测验证可登录
INSERT INTO admin_user (username, password_hash, role, display_name)
VALUES (
  'admin',
  '$2a$10$e1IoYGgHDfY7dHf9yXWKLOC76UnE2AOL3py//d05tF/Kto9mcChyC',
  2, -- 2=管理员
  '系统管理员'
)
ON CONFLICT (username) DO NOTHING;

-- ---------- 确保核心表存在（与 CSV 字段完全对齐） ----------

-- 车位主表
CREATE TABLE IF NOT EXISTS parking_spaces (
  space_id VARCHAR(20) PRIMARY KEY,
  garage_zone VARCHAR(10),
  space_num VARCHAR(10),
  status VARCHAR(20) DEFAULT '未售',
  space_type VARCHAR(20),
  building_no VARCHAR(10),
  unit_no VARCHAR(10),
  room_no VARCHAR(10),
  house_key VARCHAR(30),
  employee_name VARCHAR(50),
  owner_name VARCHAR(100),
  phone VARCHAR(20),
  price NUMERIC(12,2),
  sale_date TIMESTAMP,
  receipt_no VARCHAR(30),
  confirm_no VARCHAR(30),
  remarks TEXT,
  is_group_buy BOOLEAN DEFAULT FALSE,
  group_company VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ps_status ON parking_spaces(status);
CREATE INDEX IF NOT EXISTS idx_ps_zone ON parking_spaces(garage_zone);
CREATE INDEX IF NOT EXISTS idx_ps_house ON parking_spaces(house_key);

-- 业主信息表
CREATE TABLE IF NOT EXISTS owner_info (
  house_key VARCHAR(30) PRIMARY KEY,
  building_no VARCHAR(10),
  unit_no VARCHAR(10),
  room_no VARCHAR(10),
  building_unit_room VARCHAR(30),
  owner_name VARCHAR(100),
  phone VARCHAR(20),
  phone2 VARCHAR(20),
  parking_count INT DEFAULT 0,
  parking_spaces TEXT,
  change_record TEXT,
  parking_price NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 团购公司表
CREATE TABLE IF NOT EXISTS group_buy_company (
  company_id SERIAL PRIMARY KEY,
  company_name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  contact_person VARCHAR(50),
  phone VARCHAR(20),
  space_count INT DEFAULT 0,
  space_list TEXT,
  total_price NUMERIC(12,2) DEFAULT 0,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_paid BOOLEAN DEFAULT FALSE,
  invoice_type VARCHAR(20) DEFAULT '未开票'   -- 发票类型：专票/普票/普票个人/未开票
);

-- 团购公司购买记录表
CREATE TABLE IF NOT EXISTS group_buy_purchase (
  purchase_id SERIAL PRIMARY KEY,
  company_name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  contact_person VARCHAR(50),
  contact_phone VARCHAR(20),
  space_count INT DEFAULT 0,
  space_list TEXT,
  amount NUMERIC(12,2) DEFAULT 0,
  is_paid BOOLEAN DEFAULT FALSE,
  invoice_type VARCHAR(20) DEFAULT '未开票',
  remarks TEXT,
  operator VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 车位销售记录表
CREATE TABLE IF NOT EXISTS parking_sales_records (
  record_id SERIAL PRIMARY KEY,
  sale_order_no VARCHAR(50) UNIQUE,
  space_no VARCHAR(20),
  space_type VARCHAR(20),
  room_no VARCHAR(10),
  house_key VARCHAR(30),
  owner_name VARCHAR(100),
  phone VARCHAR(20),
  amount NUMERIC(12,2),
  sale_time TIMESTAMP,
  receipt_no VARCHAR(30),
  confirmation_no VARCHAR(30),
  is_group_buy BOOLEAN DEFAULT FALSE,
  group_company VARCHAR(100),
  remarks TEXT,
  status VARCHAR(20) DEFAULT '草稿',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  process_result TEXT,
  preview_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_sr_order ON parking_sales_records(sale_order_no);
CREATE INDEX IF NOT EXISTS idx_sr_space ON parking_sales_records(space_no);

-- 车位调换日志表
CREATE TABLE IF NOT EXISTS parking_space_change_log (
  log_id SERIAL PRIMARY KEY,
  owner_name VARCHAR(100),
  phone VARCHAR(20),
  old_space_no VARCHAR(20),
  old_space_type VARCHAR(20),
  old_house_key VARCHAR(30),
  old_space_price NUMERIC(12,2),
  new_space_no VARCHAR(20),
  new_space_type VARCHAR(20),
  new_house_key VARCHAR(30),
  new_space_price NUMERIC(12,2),
  price_difference NUMERIC(12,2) DEFAULT 0,
  swap_type VARCHAR(20),
  change_reason TEXT,
  receipt_no VARCHAR(30),          -- 旧车位确认单号
  new_receipt_no VARCHAR(30),      -- 新车位确认单号
  operator VARCHAR(50),
  changed_at TIMESTAMP DEFAULT NOW(),
  remarks TEXT,
  process_result VARCHAR(20) DEFAULT '已完成',
  preview_url TEXT,
  swap_order_no VARCHAR(50)
);

-- 字段中文注释
COMMENT ON COLUMN parking_space_change_log.receipt_no IS '旧车位确认单号';
COMMENT ON COLUMN parking_space_change_log.new_receipt_no IS '新车位确认单号';

-- 业主信息变更日志
CREATE TABLE IF NOT EXISTS owner_info_change_log (
  log_id SERIAL PRIMARY KEY,
  house_key VARCHAR(30),
  owner_name VARCHAR(100),
  phone VARCHAR(20),
  change_field VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT,
  operator VARCHAR(50),
  changed_at TIMESTAMP DEFAULT NOW()
);

-- 团购核销明细
CREATE TABLE IF NOT EXISTS group_buy_verify_detail (
  verify_id SERIAL PRIMARY KEY,
  company_id INT,
  space_id VARCHAR(20),
  house_key VARCHAR(30),
  owner_name VARCHAR(100),
  owner_phone VARCHAR(20),
  verify_date DATE,
  operator VARCHAR(50),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ---------- 数据迁移：把 CSV 已售车位批量更新状态 ----------
-- （CSV 导入后执行此段，将已售车位的 status 统一）
-- UPDATE parking_spaces SET status = '已售' WHERE owner_name IS NOT NULL AND owner_name != '' AND status = '未售';

-- ---------- 验证 ----------
-- SELECT status, COUNT(*) FROM parking_spaces GROUP BY status ORDER BY status;

-- 车位台账变更日志（记录新增 / 取消车位的时间与原因）
CREATE TABLE IF NOT EXISTS parking_space_lifecycle_log (
  log_id      SERIAL PRIMARY KEY,
  space_id    VARCHAR(20)  NOT NULL,         -- 车位号
  op_type     VARCHAR(20)  NOT NULL,         -- 操作类型：新增 / 取消
  change_order_no VARCHAR(50),               -- 变更单号
  old_status  VARCHAR(20),                  -- 操作前状态
  new_status  VARCHAR(20),                  -- 操作后状态
  reason      TEXT,                          -- 取消原因 / 备注
  operator    VARCHAR(50),                   -- 操作人
  created_at  TIMESTAMP DEFAULT NOW()        -- 操作时间
);

-- 字段中文注释
COMMENT ON COLUMN parking_space_lifecycle_log.log_id IS '日志ID（主键，自增）';
COMMENT ON COLUMN parking_space_lifecycle_log.space_id IS '车位号';
COMMENT ON COLUMN parking_space_lifecycle_log.op_type IS '操作类型（新增/取消）';
COMMENT ON COLUMN parking_space_lifecycle_log.old_status IS '操作前状态';
COMMENT ON COLUMN parking_space_lifecycle_log.new_status IS '操作后状态';
COMMENT ON COLUMN parking_space_lifecycle_log.reason IS '取消原因/备注';
COMMENT ON COLUMN parking_space_lifecycle_log.operator IS '操作人';
COMMENT ON COLUMN parking_space_lifecycle_log.created_at IS '操作时间';
COMMENT ON COLUMN parking_space_lifecycle_log.change_order_no IS '变更单号';

CREATE INDEX IF NOT EXISTS idx_lifecycle_space ON parking_space_lifecycle_log(space_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_time ON parking_space_lifecycle_log(created_at);
