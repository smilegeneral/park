-- ============================================================
--  数据初始化脚本 - 在 Aiven SQL Editor 中执行
--  作用：修正 CSV 导入后的数据一致性问题
-- ============================================================

-- 1. 统一已售车位的状态（CSV 导入后可能 status 文本不统一）
UPDATE parking_spaces
SET status = '已售'
WHERE owner_name IS NOT NULL
  AND owner_name != ''
  AND status IN ('已售', 'sold', 'SOLD');

-- 2. 填充 house_key（如果 CSV 导入时 house_key 为空但 building/unit/room 有值）
UPDATE parking_spaces
SET house_key = CONCAT(
  NULLIF(building_no, ''),
  '-',
  NULLIF(unit_no, ''),
  '-',
  NULLIF(room_no, '')
)
WHERE (house_key IS NULL OR house_key = '')
  AND building_no IS NOT NULL
  AND room_no IS NOT NULL;

-- 3. 同步 owner_info 的 parking_spaces 字段（逗号分隔）
--    把每个业主拥有的车位拼成 "A-001,A-002" 格式
UPDATE owner_info o
SET parking_spaces = (
  SELECT STRING_AGG(space_id, ',' ORDER BY space_id)
  FROM parking_spaces p
  WHERE p.house_key = o.house_key
    AND p.status IN ('已售', '已核销')
);

-- 4. 修正团购锁定状态
--    如果 group_buy_company.space_list 非空，把对应车位标为"团购锁定"
--    （注意：这一步需要逐行处理，建议用脚本循环执行）

-- 5. 验证数据
SELECT
  '总车位' AS 项目, COUNT(*) AS 数量 FROM parking_spaces
UNION ALL
SELECT '未售', COUNT(*) FROM parking_spaces WHERE status = '未售'
UNION ALL
SELECT '已售', COUNT(*) FROM parking_spaces WHERE status = '已售'
UNION ALL
SELECT '零售锁定', COUNT(*) FROM parking_spaces WHERE status = '零售锁定'
UNION ALL
SELECT '团购锁定', COUNT(*) FROM parking_spaces WHERE status = '团购锁定'
UNION ALL
SELECT '已核销', COUNT(*) FROM parking_spaces WHERE status = '已核销';

-- 6. 查看业主车位分布（前20）
SELECT
  house_key,
  owner_name,
  parking_count,
  parking_spaces,
  parking_price
FROM owner_info
ORDER BY parking_count DESC
LIMIT 20;
