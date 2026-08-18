-- 车位调换日志表补充 employee_name 字段（记录旧车位员工姓名）
-- 在已存在的 parking_space_change_log 表上安全添加列
ALTER TABLE parking_space_change_log
  ADD COLUMN IF NOT EXISTS employee_name VARCHAR(50);
