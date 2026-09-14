-- ============================================================
-- 历史数据修复：团购锁定车位的 price 为 0 导致「团购预定」金额为 0
-- ------------------------------------------------------------
-- 背景：团购购买登记时只更新了 status / group_company，未写入 price，
--       团购核销时又明确不改写 price，因此所有团购锁定车位的 price 停留在
--       未售默认值（0）。销售构成汇总「团购预定（公司已买，待核销）」用 price
--       求和，自然得到 0。
--
-- 修复：把团购锁定且 price 仍为 0 的车位，按其所属团购公司的
--       （总购买金额 / 总购买车位数）平摊回填为「团购车位金额（实际卖价）」。
--       前提：同一公司团购车位价格一致（系统未记录逐车位价格，此为近似修复）。
--
-- 已核销车位的 price 若是真实值（非 0）不会被本脚本覆盖。
-- 执行前请先备份；执行后用下方 SELECT 复核。
-- ============================================================

UPDATE parking_spaces p
SET price = (c.total_price::numeric / NULLIF(c.space_count, 0))
FROM (
  SELECT company_name,
         SUM(total_price)  AS total_price,
         SUM(space_count)  AS space_count
  FROM group_buy_company
  GROUP BY company_name
) c
WHERE p.status = '团购锁定'
  AND (p.price IS NULL OR p.price = 0)
  AND p.group_company = c.company_name
  AND c.space_count > 0;

-- 复核：应显示各公司锁定车位数与回填后的金额合计（应 > 0）
SELECT group_company,
       COUNT(*)                                   AS locked_count,
       SUM(price)                                 AS locked_amount
FROM parking_spaces
WHERE status = '团购锁定'
GROUP BY group_company
ORDER BY group_company;
