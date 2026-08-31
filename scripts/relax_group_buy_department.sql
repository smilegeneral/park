-- 放宽团购部门限制：支持手工输入任意部门名称
-- 需要以表属主（postgres 超级用户）执行，应用账号 parkapp 无权 ALTER 该表。
--
-- 执行方式（在本机 PowerShell 中，按提示输入 postgres 密码）：
--   psql -U postgres -d parkdb -f D:/park-system/scripts/relax_group_buy_department.sql
-- 若 psql 不在 PATH，使用完整路径，例如：
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d parkdb -f D:/park-system/scripts/relax_group_buy_department.sql

BEGIN;

-- 去掉"只能是莱山分公司/开发分公司/建设分公司"的三选一限制
ALTER TABLE group_buy_company DROP CONSTRAINT IF EXISTS chk_department;

-- 保留数据完整性：部门仍为必填，但不允许空白字符串
ALTER TABLE group_buy_company
  ADD CONSTRAINT chk_department_not_blank CHECK (length(btrim(department)) > 0);

COMMIT;

-- 校验结果（应只看到 chk_department_not_blank，且没有 chk_department）
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'group_buy_company'::regclass
  AND conname ILIKE '%department%';
