import pool from './db'
import type {
  ParkingSpace,
  OwnerInfo,
  GroupBuyCompany,
  SpaceStats,
  ParkingSaleRecord,
  SpaceChangeLog,
  OwnerChangeLog,
  GroupBuyPurchase,
  GroupBuyStat,
  GroupBuyVerifyDetail,
  AdminUser,
  Permission,
  SpaceSearchParams,
  PrintTemplate,
  GarageMap,
  ReportSummary,
  ZoneUnsoldStat,
  TopOwnerStat,
  NotBoughtOwnerStat,
} from './types'

// ============================================================
//  所有 SQL 查询集中在此文件，方便维护和优化
// ============================================================

// ---------- 仪表盘统计 ----------
export async function getSpaceStats(): Promise<SpaceStats> {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COALESCE(SUM(CASE WHEN status = '未售' THEN 1 ELSE 0 END), 0)::int AS unsold,
      COALESCE(SUM(CASE WHEN status = '已售' THEN 1 ELSE 0 END), 0)::int AS sold,
      COALESCE(SUM(CASE WHEN status = '零售锁定' THEN 1 ELSE 0 END), 0)::int AS retail_locked,
      COALESCE(SUM(CASE WHEN status = '团购锁定' THEN 1 ELSE 0 END), 0)::int AS group_locked,
      COALESCE(SUM(CASE WHEN status = '已售' AND is_group_buy = TRUE THEN 1 ELSE 0 END), 0)::int AS group_verified
    FROM parking_spaces
  `)
  return rows[0] as SpaceStats
}

// ---------- 车位列表（销控图用） ----------
export async function getAllSpaces(): Promise<ParkingSpace[]> {
  const { rows } = await pool.query(`
    SELECT * FROM parking_spaces
    ORDER BY garage_zone, space_num
  `)
  return rows as ParkingSpace[]
}

// ---------- 未售车位列表（取消车位界面用） ----------
export async function getUnsoldSpaces(): Promise<ParkingSpace[]> {
  const { rows } = await pool.query(`
    SELECT * FROM parking_spaces
    WHERE status = '未售'
    ORDER BY garage_zone, space_num
  `)
  return rows as ParkingSpace[]
}

// ---------- 打印模板 ----------
export async function getPrintTemplates(type?: string): Promise<PrintTemplate[]> {
  const { rows } = type
    ? await pool.query(`SELECT * FROM print_templates WHERE type=$1 ORDER BY id DESC`, [type])
    : await pool.query(`SELECT * FROM print_templates ORDER BY id DESC`)
  return rows as PrintTemplate[]
}

export async function getPrintTemplateById(id: number): Promise<PrintTemplate | null> {
  const { rows } = await pool.query(`SELECT * FROM print_templates WHERE id=$1`, [id])
  return rows.length ? (rows[0] as PrintTemplate) : null
}

// ---------- 按区域获取车位 ----------
export async function getSpacesByZone(zone: string): Promise<ParkingSpace[]> {
  const { rows } = await pool.query(
    `SELECT * FROM parking_spaces WHERE garage_zone = $1 ORDER BY space_num`,
    [zone]
  )
  return rows as ParkingSpace[]
}

// ---------- 按状态获取车位 ----------
export async function getSpacesByStatus(status: string): Promise<ParkingSpace[]> {
  const { rows } = await pool.query(
    `SELECT * FROM parking_spaces WHERE status = $1 ORDER BY space_id`,
    [status]
  )
  return rows as ParkingSpace[]
}

// ---------- 获取单个车位详情 ----------
export async function getSpaceById(spaceId: string): Promise<ParkingSpace | null> {
  const { rows } = await pool.query(
    `SELECT * FROM parking_spaces WHERE space_id = $1`,
    [spaceId]
  )
  return rows.length > 0 ? (rows[0] as ParkingSpace) : null
}

// ---------- 业主信息 ----------
export async function getAllOwners(): Promise<OwnerInfo[]> {
  const { rows } = await pool.query(`
    SELECT * FROM owner_info ORDER BY house_key
  `)
  return rows as OwnerInfo[]
}

export async function getOwnerByHouseKey(houseKey: string): Promise<OwnerInfo | null> {
  const { rows } = await pool.query(
    `SELECT * FROM owner_info WHERE house_key = $1`,
    [houseKey]
  )
  return rows.length > 0 ? (rows[0] as OwnerInfo) : null
}

// ---------- 业主信息变更日志 ----------
export async function getOwnerChangeLogs(limit = 50): Promise<OwnerChangeLog[]> {
  const { rows } = await pool.query(
    `SELECT * FROM owner_info_change_log ORDER BY changed_at DESC LIMIT $1`,
    [limit]
  )
  return rows as OwnerChangeLog[]
}

// ---------- 团购公司 ----------
export async function getAllGroupCompanies(): Promise<GroupBuyCompany[]> {
  const { rows } = await pool.query(`
    SELECT * FROM group_buy_company ORDER BY company_id
  `)
  return rows as GroupBuyCompany[]
}

export async function getGroupCompanyById(id: number): Promise<GroupBuyCompany | null> {
  const { rows } = await pool.query(
    `SELECT * FROM group_buy_company WHERE company_id = $1`,
    [id]
  )
  return rows.length > 0 ? (rows[0] as GroupBuyCompany) : null
}

// ---------- 团购公司购买记录 ----------
export async function getGroupBuyPurchases(companyName?: string): Promise<GroupBuyPurchase[]> {
  let rows
  if (companyName) {
    const r = await pool.query(
      `SELECT * FROM group_buy_purchase WHERE company_name = $1 ORDER BY created_at DESC`,
      [companyName]
    )
    rows = r.rows
  } else {
    const r = await pool.query(
      `SELECT * FROM group_buy_purchase ORDER BY created_at DESC`
    )
    rows = r.rows
  }
  return rows as GroupBuyPurchase[]
}

// ---------- 团购统计（按部门 / 按公司聚合） ----------
export async function getGroupBuyStats(mode: 'department' | 'company'): Promise<GroupBuyStat[]> {
  const dim = mode === 'company' ? 'company_name' : 'department'
  const { rows } = await pool.query(
    `SELECT
        ${dim} AS dim_key,
        COALESCE(SUM(space_count), 0)::int AS total_spaces,
        COALESCE(SUM(amount), 0)::numeric AS total_amount,
        COALESCE(SUM(CASE WHEN is_paid THEN space_count ELSE 0 END), 0)::int AS paid_spaces,
        COALESCE(SUM(CASE WHEN is_paid THEN amount ELSE 0 END), 0)::numeric AS paid_amount,
        COALESCE(SUM(CASE WHEN NOT is_paid THEN space_count ELSE 0 END), 0)::int AS unpaid_spaces,
        COALESCE(SUM(CASE WHEN NOT is_paid THEN amount ELSE 0 END), 0)::numeric AS unpaid_amount
     FROM group_buy_purchase
     WHERE ${dim} IS NOT NULL AND ${dim} <> ''
     GROUP BY ${dim}
     ORDER BY total_amount DESC`
  )
  return rows as GroupBuyStat[]
}

// ---------- 团购统计明细：列出某部门/某团购公司购买的每个车位详情 ----------
// 若不传 dimKey，则列出所有购买记录的车位详情
export async function getGroupBuyStatsDetail(
  mode: 'department' | 'company',
  dimKey?: string
): Promise<any[]> {
  const dim = mode === 'company' ? 'company_name' : 'department'
  let where = `1=1`
  const params: any[] = []
  if (dimKey && dimKey.trim()) {
    where = `${dim} = $1`
    params.push(dimKey.trim())
  }
  const { rows } = await pool.query(
    `SELECT
        p.purchase_id,
        p.company_name,
        p.department,
        p.contact_person,
        p.contact_phone,
        p.space_count,
        p.space_list,
        p.amount,
        p.invoice_type,
        p.is_paid,
        p.remarks,
        p.created_at
     FROM group_buy_purchase p
     WHERE ${where}
     ORDER BY p.created_at DESC`,
    params
  )
  return rows
}

// ---------- 未售车位（用于团购锁定 / 调换） ----------
export async function getUnsoldSpacesForGroupBuy(): Promise<ParkingSpace[]> {
  const { rows } = await pool.query(
    `SELECT * FROM parking_spaces WHERE status = '未售' ORDER BY space_id`
  )
  return rows as ParkingSpace[]
}

// ---------- 某团购公司名下的所有车位（团购锁定/已核销） ----------
export async function getCompanySpaces(companyName: string): Promise<ParkingSpace[]> {
  const { rows } = await pool.query(
    `SELECT * FROM parking_spaces
     WHERE group_company = $1
     ORDER BY space_id`,
    [companyName.trim()]
  )
  return rows as ParkingSpace[]
}

// ---------- 团购核销明细列表 ----------
export async function getGroupBuyVerifyDetails(companyName?: string): Promise<GroupBuyVerifyDetail[]> {
  let where = ''
  const params: any[] = []
  if (companyName && companyName.trim()) {
    where = 'WHERE company_name = $1'
    params.push(companyName.trim())
  }
  const { rows } = await pool.query(
    `SELECT * FROM group_buy_verify_detail ${where} ORDER BY created_at DESC`,
    params
  )
  return rows as GroupBuyVerifyDetail[]
}

// ---------- 后台用户管理 ----------
export async function getAdminUsers(): Promise<AdminUser[]> {
  const { rows } = await pool.query(
    `SELECT id, username, display_name, role, COALESCE(permissions,'{}') AS permissions
     FROM admin_user ORDER BY role DESC, id ASC`
  )
  return rows.map(r => ({
    id: r.id,
    username: r.username,
    display_name: r.display_name || '',
    role: r.role,
    permissions: (r.permissions || '{}').startsWith('[')
      ? JSON.parse(r.permissions)
      : [],
  })) as AdminUser[]
}

export async function getAdminUserById(id: number): Promise<AdminUser | null> {
  const { rows } = await pool.query(
    `SELECT id, username, display_name, role, COALESCE(permissions,'{}') AS permissions
     FROM admin_user WHERE id = $1`,
    [id]
  )
  if (rows.length === 0) return null
  const r = rows[0]
  return {
    id: r.id, username: r.username, display_name: r.display_name || '',
    role: r.role, permissions: (r.permissions || '{}').startsWith('[') ? JSON.parse(r.permissions) : [],
  } as AdminUser
}

// ---------- 车位模糊查询 ----------
export async function searchSpaces(params: SpaceSearchParams, limit = 200): Promise<ParkingSpace[]> {
  const conds: string[] = []
  const vals: any[] = []
  let i = 1
  const like = (col: string, val?: string) => {
    if (val && val.trim()) {
      conds.push(`${col} ILIKE $${i}`)
      vals.push(`%${val.trim()}%`)
      i++
    }
  }
  const exact = (col: string, val?: string) => {
    if (val && val.trim()) {
      conds.push(`${col} = $${i}`)
      vals.push(val.trim())
      i++
    }
  }
  like('space_id', params.space_id)
  exact('garage_zone', params.garage_zone)
  exact('building_no', params.building_no)
  exact('unit_no', params.unit_no)
  exact('status', params.status)
  like('owner_name', params.owner_name)
  like('phone', params.phone)
  like('house_key', params.house_key)
  exact('space_type', params.space_type)

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const { rows } = await pool.query(
    `SELECT * FROM parking_spaces ${where} ORDER BY garage_zone, building_no, space_id LIMIT $${i}`,
    [...vals, limit]
  )
  return rows as ParkingSpace[]
}

// ---------- 销售记录 ----------
export async function getSaleRecords(limit = 50): Promise<ParkingSaleRecord[]> {
  const { rows } = await pool.query(
    `SELECT * FROM parking_sales_records ORDER BY created_at DESC LIMIT $1`,
    [limit]
  )
  return rows as ParkingSaleRecord[]
}

// 模糊查询销售记录：车位号 / 房号 / 业主姓名 / 销售单号 任意匹配
export async function searchSaleRecords(keyword?: string, limit = 500): Promise<ParkingSaleRecord[]> {
  const kw = (keyword || '').trim()
  if (!kw) {
    const { rows } = await pool.query(
      `SELECT * FROM parking_sales_records ORDER BY created_at DESC LIMIT $1`,
      [limit]
    )
    return rows as ParkingSaleRecord[]
  }
  const like = `%${kw}%`
  const { rows } = await pool.query(
    `SELECT * FROM parking_sales_records
     WHERE space_no      ILIKE $1
        OR house_key     ILIKE $1
        OR owner_name    ILIKE $1
        OR sale_order_no ILIKE $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [like, limit]
  )
  return rows as ParkingSaleRecord[]
}

// ---------- 调换日志 ----------
// 获取下一个车位调换单号: BG + 三位数字, 从 074 起累加
export async function getNextSwapOrderNo(): Promise<string> {
  const { rows } = await pool.query(
    `SELECT swap_order_no FROM parking_space_change_log
     WHERE swap_order_no LIKE 'BG%'
     ORDER BY swap_order_no DESC LIMIT 1`
  )
  let next = 74
  if (rows.length > 0) {
    const m = /BG(\d+)/.exec(rows[0].swap_order_no || '')
    if (m) next = parseInt(m[1], 10) + 1
  }
  return `BG${String(next).padStart(3, '0')}`
}

// 获取下一个车位销售单号: S + 三位数字, 取库中 S 前缀最大序号 +1
export async function getNextSaleOrderNo(): Promise<string> {
  const { rows } = await pool.query(
    `SELECT sale_order_no FROM parking_sales_records
     WHERE sale_order_no LIKE 'S%'
     ORDER BY sale_order_no DESC LIMIT 1`
  )
  let next = 1
  if (rows.length > 0) {
    const m = /S(\d+)/.exec(rows[0].sale_order_no || '')
    if (m) next = parseInt(m[1], 10) + 1
  }
  return `S${String(next).padStart(3, '0')}`
}

export async function getChangeLogs(limit = 50): Promise<SpaceChangeLog[]> {
  const { rows } = await pool.query(
    `SELECT * FROM parking_space_change_log ORDER BY changed_at DESC LIMIT $1`,
    [limit]
  )
  return rows as SpaceChangeLog[]
}

// 模糊查询变更记录：车位号 / 房号 / 业主姓名 任意匹配
export async function searchChangeLogs(keyword?: string, limit = 500): Promise<SpaceChangeLog[]> {
  const kw = (keyword || '').trim()
  if (!kw) {
    const { rows } = await pool.query(
      `SELECT * FROM parking_space_change_log ORDER BY changed_at DESC LIMIT $1`,
      [limit]
    )
    return rows as SpaceChangeLog[]
  }
  const like = `%${kw}%`
  const { rows } = await pool.query(
    `SELECT * FROM parking_space_change_log
     WHERE old_space_no ILIKE $1
        OR new_space_no ILIKE $1
        OR owner_name  ILIKE $1
        OR old_house_key ILIKE $1
        OR new_house_key ILIKE $1
     ORDER BY changed_at DESC
     LIMIT $2`,
    [like, limit]
  )
  return rows as SpaceChangeLog[]
}

// ---------- 区域列表（动态从数据获取） ----------
export async function getZones(): Promise<string[]> {
  const { rows } = await pool.query(`
    SELECT DISTINCT garage_zone FROM parking_spaces ORDER BY garage_zone
  `)
  return rows.map((r: any) => r.garage_zone)
}

// ---------- 车位分布图：某区/全部未售车位 ----------
export async function getUnsoldSpacesByZone(zone: string): Promise<ParkingSpace[]> {
  const { rows } = await pool.query(
    `SELECT * FROM parking_spaces WHERE status = '未售' AND garage_zone = $1 ORDER BY space_num`,
    [zone]
  )
  return rows as ParkingSpace[]
}

// ---------- 车位分布图：获取某区图片（含全部六区，无图返回 null） ----------
export async function getGarageMaps(): Promise<GarageMap[]> {
  const { rows } = await pool.query(`SELECT * FROM garage_maps ORDER BY zone`)
  return rows as GarageMap[]
}

export async function getGarageMapByZone(zone: string): Promise<GarageMap | null> {
  const { rows } = await pool.query(`SELECT * FROM garage_maps WHERE zone = $1`, [zone])
  return rows.length ? (rows[0] as GarageMap) : null
}

// ---------- 车位调换：按房号查名下已售/已核销车位 ----------
export async function getOwnerSoldSpaces(houseKey: string): Promise<ParkingSpace[]> {
  const { rows } = await pool.query(
    `SELECT * FROM parking_spaces
     WHERE house_key = $1 AND status IN ('已售','已核销')
     ORDER BY space_id`,
    [houseKey.trim()]
  )
  return rows as ParkingSpace[]
}

// ---------- 车位调换：查旧车位原确认单号（销售记录中的收据编号） ----------
export async function getOldReceiptNo(spaceId: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT receipt_no FROM parking_sales_records
     WHERE space_no = $1 ORDER BY sale_time DESC LIMIT 1`,
    [spaceId.trim()]
  )
  return rows.length ? (rows[0].receipt_no as string) : null
}

// ---------- 车位台账变更日志（新增 / 取消） ----------
export interface SpaceLifecycleLog {
  log_id: number
  space_id: string
  op_type: string       // 新增 / 取消
  change_order_no: string | null  // 变更单号
  old_status: string | null
  new_status: string | null
  reason: string | null
  operator: string | null
  created_at: Date
}

// 写入一条车位台账变更记录（在事务内调用，使用传入的 client）
export async function insertLifecycleLog(
  client: any,
  data: { space_id: string; op_type: string; change_order_no?: string | null; old_status?: string | null; new_status?: string | null; reason?: string | null; operator?: string | null }
) {
  await client.query(
    `INSERT INTO parking_space_lifecycle_log
     (space_id, op_type, change_order_no, old_status, new_status, reason, operator, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
    [
      data.space_id,
      data.op_type,
      data.change_order_no ?? null,
      data.old_status ?? null,
      data.new_status ?? null,
      data.reason ?? null,
      data.operator ?? null,
    ]
  )
}

// 查询车位台账变更日志（默认按时间倒序）
// spaceId 为空查全部；非空时按车位号模糊匹配（ILIKE，忽略大小写）
export async function getLifecycleLogs(spaceId?: string, limit = 200): Promise<SpaceLifecycleLog[]> {
  const params: any[] = []
  let where = ''
  if (spaceId && spaceId.trim()) {
    where = 'WHERE space_id ILIKE $1'
    params.push(`%${spaceId.trim()}%`)
  }
  const { rows } = await pool.query(
    `SELECT * FROM parking_space_lifecycle_log ${where} ORDER BY created_at DESC LIMIT $${params.length + 1}`,
    [...params, limit]
  )
  return rows as SpaceLifecycleLog[]
}

// ============================================================
//  报表统计
// ============================================================

// 汇总指标：已售总金额（含团购已核销/已售）、已售总数、未售总数
export async function getReportSummary(): Promise<ReportSummary> {
  const { rows } = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('已售','已核销') THEN COALESCE(price,0) END), 0)::numeric AS total_sold_amount,
      COALESCE(SUM(CASE WHEN status IN ('已售','已核销') THEN 1 ELSE 0 END), 0)::int AS total_sold_count,
      COALESCE(SUM(CASE WHEN status = '未售' THEN 1 ELSE 0 END), 0)::int AS total_unsold,
      COALESCE(SUM(CASE WHEN status = '已售' AND is_group_buy = TRUE THEN 1 ELSE 0 END), 0)::int AS group_verified_count
    FROM parking_spaces
  `)
  return rows[0] as ReportSummary
}

// 按车库（区域）统计未售车位个数
export async function getUnsoldByZone(): Promise<ZoneUnsoldStat[]> {
  const { rows } = await pool.query(`
    SELECT garage_zone,
           COUNT(*)::int AS unsold_count
    FROM parking_spaces
    WHERE status = '未售'
    GROUP BY garage_zone
    ORDER BY garage_zone
  `)
  return rows as ZoneUnsoldStat[]
}

// 购买车位最多的业主（按 house_key 聚合已售车位）
export async function getTopOwners(limit = 10): Promise<TopOwnerStat[]> {
  const { rows } = await pool.query(
    `SELECT owner_name, building_no, unit_no, room_no, house_key,
            COUNT(*)::int AS space_count,
            COALESCE(SUM(COALESCE(price,0)),0)::numeric AS total_amount
     FROM parking_spaces
     WHERE status IN ('已售','已核销') AND owner_name IS NOT NULL AND owner_name <> ''
     GROUP BY owner_name, building_no, unit_no, room_no, house_key
     ORDER BY space_count DESC, total_amount DESC
     LIMIT $1`,
    [limit]
  )
  return rows as TopOwnerStat[]
}

// 未购买车位的业主（在 owner_info 但名下无已售/已核销车位）
export async function getOwnersNotBought(): Promise<NotBoughtOwnerStat[]> {
  const { rows } = await pool.query(`
    SELECT o.house_key, o.building_no, o.unit_no, o.room_no, o.owner_name, o.phone
    FROM owner_info o
    WHERE NOT EXISTS (
      SELECT 1 FROM parking_spaces p
      WHERE p.house_key = o.house_key
        AND p.status IN ('已售','已核销')
    )
    ORDER BY o.building_no, o.unit_no, o.room_no
  `)
  return rows as NotBoughtOwnerStat[]
}
