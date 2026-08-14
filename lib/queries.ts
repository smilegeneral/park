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
  AdminUser,
  Permission,
  SpaceSearchParams,
  PrintTemplate,
  GarageMap,
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
  like('building_no', params.building_no)
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

// ---------- 调换日志 ----------
export async function getChangeLogs(limit = 50): Promise<SpaceChangeLog[]> {
  const { rows } = await pool.query(
    `SELECT * FROM parking_space_change_log ORDER BY changed_at DESC LIMIT $1`,
    [limit]
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
