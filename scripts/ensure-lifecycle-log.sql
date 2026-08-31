-- ============================================================
--  车位台账变更日志表（parking_space_lifecycle_log）
--  用途：记录车位 新增 / 取消 / 团购锁定 / 核销 等状态变更
--
--  问题背景：团购公司购买登记提交时报
--  "An error occurred in the Server Components render ..."
--  生产环境会把真实错误脱敏。实际原因是本表在数据库中不存在，
--  提交时 insertLifecycleLog() 写入失败导致整个事务回滚。
--  本表只写不查（仅在 /dashboard/spaces/logs 页面查询），
--  因此页面能正常打开，但提交会失败。
--
--  执行方式：在 Aiven 控制台 → 你的服务 → SQL Editor 中执行本脚本。
--  本脚本幂等（IF NOT EXISTS），可重复执行，已有数据不受影响。
-- ============================================================

CREATE TABLE IF NOT EXISTS parking_space_lifecycle_log (
  log_id          SERIAL PRIMARY KEY,
  space_id        VARCHAR(20)  NOT NULL,   -- 车位号
  op_type         VARCHAR(20)  NOT NULL,   -- 操作类型：新增 / 取消 / 团购锁定 等
  change_order_no VARCHAR(50),             -- 变更单号
  old_status      VARCHAR(20),             -- 操作前状态
  new_status      VARCHAR(20),             -- 操作后状态
  reason          TEXT,                    -- 取消原因 / 备注
  operator        VARCHAR(50),             -- 操作人
  created_at      TIMESTAMP DEFAULT NOW()  -- 操作时间
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_space ON parking_space_lifecycle_log(space_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_time  ON parking_space_lifecycle_log(created_at);

-- 验证：应返回表名，若返回空则说明未创建成功
SELECT to_regclass('public.parking_space_lifecycle_log') AS lifecycle_log_table;
