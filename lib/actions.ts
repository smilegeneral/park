'use server'
import { withTransaction } from './db'
import { getSpaceById, getOwnerSoldSpaces, getOldReceiptNo } from './queries'
import type { ParkingSpace } from './types'

// ============================================================
//  所有写操作（锁位/销售/调换/团购/核销）集中在此
//  全部使用数据库事务，保证数据一致性
// ============================================================

// ==================== 车位预订 ====================
export interface BookSpaceInput {
  space_id: string
  booker_name?: string
  booker_phone?: string
  house_key?: string
}

// 未售车位可预订（记录预订人/电话/房号），用于预留给客户
export async function bookSpace(input: BookSpaceInput) {
  return withTransaction(async (client) => {
    // 乐观锁：只有"未售"才能预订，防止并发超卖
    const res = await client.query(
      `UPDATE parking_spaces
       SET status = '预订',
           booker_name = $2, booker_phone = $3, house_key = $4,
           updated_at = NOW()
       WHERE space_id = $1 AND status = '未售'
       RETURNING *`,
      [input.space_id, input.booker_name || '', input.booker_phone || '', input.house_key || '']
    )
    if (res.rowCount === 0) {
      throw new Error(`车位 ${input.space_id} 当前不可预订（可能已被占用）`)
    }
    return res.rows[0]
  })
}

// ==================== 解除预订 ====================
export async function cancelBooking(spaceId: string) {
  return withTransaction(async (client) => {
    const res = await client.query(
      `UPDATE parking_spaces
       SET status = '未售', booker_name = '', booker_phone = '',
           owner_name = '', phone = '', house_key = '', updated_at = NOW()
       WHERE space_id = $1 AND status = '预订'
       RETURNING *`,
      [spaceId]
    )
    if (res.rowCount === 0) {
      throw new Error(`车位 ${spaceId} 当前不是预订状态，无需解除`)
    }
    return res.rows[0]
  })
}

// ==================== 零售销售确认 ====================
export interface RetailSaleInput {
  space_id: string
  sale_order_no: string
  owner_name: string
  phone: string
  price: number
  house_key: string
  receipt_no: string
  confirm_no: string
  remarks?: string
}

export async function confirmRetailSale(input: RetailSaleInput, _operator: string) {
  return withTransaction(async (client) => {
    // 1. 检查车位状态（必须是零售锁定）
    const spaceRes = await client.query(
      `SELECT * FROM parking_spaces WHERE space_id = $1`,
      [input.space_id]
    )
    if (spaceRes.rowCount === 0) throw new Error('车位不存在')
    const space = spaceRes.rows[0] as ParkingSpace
    if (space.status !== '预订' && space.status !== '未售') {
      throw new Error(`车位状态为"${space.status}"，无法直接销售（需为预订或未售）`)
    }

    // 2. 使用界面录入的销售单号
    const saleOrderNo = input.sale_order_no

    // 3. 写入销售记录
    // 注意：is_group_buy 列是 varchar，数据库 CHECK 约束只允许 '是'/'否'
    await client.query(
      `INSERT INTO parking_sales_records
       (sale_order_no, space_no, space_type, room_no, house_key, owner_name, phone,
        amount, sale_time, receipt_no, confirmation_no, remarks, is_group_buy, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,$10,$11,'否','已确认')`,
      [
        saleOrderNo, input.space_id, space.space_type, input.house_key, input.house_key,
        input.owner_name, input.phone, input.price,
        input.receipt_no, input.confirm_no, input.remarks || '',
      ]
    )

    // 4. 更新车位状态 → 已售
    await client.query(
      `UPDATE parking_spaces
       SET status = '已售',
           owner_name = $1,
           phone = $2,
           price = $3,
           sale_date = NOW(),
           receipt_no = $4,
           confirm_no = $5,
           house_key = $6,
           remarks = COALESCE($7, ''),
           updated_at = NOW()
       WHERE space_id = $8`,
      [
        input.owner_name, input.phone, input.price,
        input.receipt_no, input.confirm_no,
        input.house_key, input.remarks || '',
        input.space_id,
      ]
    )

    // 5. 更新/插入业主信息
    await upsertOwner(client, {
      house_key: input.house_key,
      owner_name: input.owner_name,
      phone: input.phone,
      space_id: input.space_id,
      price: input.price,
    })

    return {
      sale_order_no: saleOrderNo,
      space_id: input.space_id,
      space_type: space.space_type,
      owner_name: input.owner_name,
      phone: input.phone,
      house_key: input.house_key,
      amount: input.price,
      receipt_no: input.receipt_no,
      confirm_no: input.confirm_no,
      remarks: input.remarks || '',
      sale_time: new Date().toISOString(),
    }
  })
}

// ==================== 业主信息 upsert 辅助 ====================
async function upsertOwner(
  client: any,
  data: { house_key: string; owner_name: string; phone: string; space_id: string; price: number }
) {
  const exist = await client.query(
    `SELECT * FROM owner_info WHERE house_key = $1`,
    [data.house_key]
  )

  if (exist.rowCount > 0) {
    const cur = exist.rows[0]
    const oldSpaces = cur.parking_spaces || ''
    const newSpaces = oldSpaces
      ? oldSpaces.split(',').concat([data.space_id]).join(',')
      : data.space_id
    const newCount = (cur.parking_count || 0) + 1
    const newPrice = parseFloat(cur.parking_price || 0) + data.price

    await client.query(
      `UPDATE owner_info
       SET owner_name = $1, phone = $2, parking_spaces = $3,
           parking_count = $4, parking_price = $5, updated_at = NOW()
       WHERE house_key = $6`,
      [data.owner_name, data.phone, newSpaces, newCount, newPrice, data.house_key]
    )
  } else {
    const parts = data.house_key.split('-')
    await client.query(
      `INSERT INTO owner_info
       (house_key, building_no, unit_no, room_no, building_unit_room,
        owner_name, phone, parking_count, parking_spaces, parking_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$9)`,
      [
        data.house_key,
        parts[0] || '', parts[1] || '', parts[2] || '', data.house_key,
        data.owner_name, data.phone, data.space_id, data.price,
      ]
    )
  }
}

// ==================== 车位调换 ====================
export interface SwapInput {
  old_space_id: string
  new_space_id: string
  owner_name: string
  phone: string
  house_key: string
  price_difference: number
  swap_type: string
  change_reason: string
  receipt_no: string
  new_receipt_no?: string
  new_space_price?: string
  remarks?: string
  operator: string
}

export async function swapSpace(input: SwapInput) {
  return withTransaction(async (client) => {
    const oldS = await client.query(
      `SELECT * FROM parking_spaces WHERE space_id = $1`,
      [input.old_space_id]
    )
    if (oldS.rowCount === 0) throw new Error(`原车位 ${input.old_space_id} 不存在`)

    const newS = await client.query(
      `SELECT * FROM parking_spaces WHERE space_id = $1`,
      [input.new_space_id]
    )
    if (newS.rowCount === 0) throw new Error(`目标车位 ${input.new_space_id} 不存在`)

    const targetSpace = newS.rows[0]
    if (targetSpace.status !== '未售' && input.swap_type !== '业主互调') {
      throw new Error(`目标车位状态为"${targetSpace.status}"，无法调换`)
    }

    const swapOrderNo = `SW-${Date.now()}`

    await client.query(
      `INSERT INTO parking_space_change_log
       (owner_name, phone, old_space_no, old_space_type, old_house_key,
        old_space_price, new_space_no, new_space_type, new_house_key,
        new_space_price, price_difference, swap_type, change_reason,
        receipt_no, new_receipt_no, remarks, operator, changed_at, swap_order_no, process_result)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),$18,'已完成')`,
      [
        input.owner_name, input.phone,
        input.old_space_id, oldS.rows[0].space_type, input.house_key,
        oldS.rows[0].price,
        input.new_space_id, targetSpace.space_type, input.house_key,
        input.new_space_price || '',
        input.price_difference, input.swap_type, input.change_reason,
        input.receipt_no, input.new_receipt_no || '', input.remarks || '', input.operator, swapOrderNo,
      ]
    )

    // 原车位 → 未售
    await client.query(
      `UPDATE parking_spaces
       SET status = '未售', owner_name = '', phone = '',
           house_key = '', updated_at = NOW()
       WHERE space_id = $1`,
      [input.old_space_id]
    )

    // 新车位 → 已售
    await client.query(
      `UPDATE parking_spaces
       SET status = '已售', owner_name = $1, phone = $2,
           house_key = $3, price = $4, sale_date = NOW(),
           confirm_no = $5, updated_at = NOW()
       WHERE space_id = $6`,
      [
        input.owner_name, input.phone, input.house_key,
        input.new_space_price || '', input.new_receipt_no || '', input.new_space_id,
      ]
    )

    // 更新业主车位列表
    await client.query(
      `UPDATE owner_info
       SET parking_spaces = REPLACE(parking_spaces, $1, $2),
           updated_at = NOW()
       WHERE house_key = $3`,
      [input.old_space_id, input.new_space_id, input.house_key]
    )

    return { swap_order_no: swapOrderNo }
  })
}

// ==================== 团购下单 ====================
export interface GroupBuyInput {
  company_id: number
  space_ids: string[]
  operator: string
}

export async function createGroupBuy(input: GroupBuyInput) {
  return withTransaction(async (client) => {
    const comp = await client.query(
      `SELECT * FROM group_buy_company WHERE company_id = $1`,
      [input.company_id]
    )
    if (comp.rowCount === 0) throw new Error('团购公司不存在')

    for (const sid of input.space_ids) {
      const r = await client.query(
        `UPDATE parking_spaces
         SET status = '团购锁定', updated_at = NOW()
         WHERE space_id = $1 AND status = '未售'
         RETURNING *`,
        [sid]
      )
      if (r.rowCount === 0) {
        throw new Error(`车位 ${sid} 锁定失败（可能已被占用）`)
      }
    }

    await client.query(
      `UPDATE group_buy_company
       SET space_list = $1, space_count = $2, updated_at = NOW()
       WHERE company_id = $3`,
      [input.space_ids.join(','), input.space_ids.length, input.company_id]
    )

    return { locked_count: input.space_ids.length }
  })
}

// ==================== 团购公司购买登记 ====================
export interface GroupBuyPurchaseInput {
  company_name: string
  department: string
  contact_person: string
  contact_phone: string
  space_ids: string[]      // 购买的车位编号列表
  amount: number
  is_paid: boolean
  invoice_type: string     // 专票/普票/普票个人/未开票
  remarks: string
  operator: string
}

export async function createGroupBuyPurchase(input: GroupBuyPurchaseInput) {
  return withTransaction(async (client) => {
    // 1. 写入购买记录
    const purRes = await client.query(
      `INSERT INTO group_buy_purchase
       (company_name, department, contact_person, contact_phone,
        space_count, space_list, amount, is_paid, invoice_type, remarks, operator)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING purchase_id`,
      [
        input.company_name, input.department, input.contact_person, input.contact_phone,
        input.space_ids.length, input.space_ids.join(','),
        input.amount, input.is_paid, input.invoice_type, input.remarks || '', input.operator,
      ]
    )
    const purchaseId = purRes.rows[0].purchase_id

    // 2. 联动锁定车位（乐观锁，只有未售状态才能锁）
    for (const sid of input.space_ids) {
      const r = await client.query(
        `UPDATE parking_spaces
         SET status = '团购锁定', group_company = $2, updated_at = NOW()
         WHERE space_id = $1 AND status = '未售'
         RETURNING *`,
        [sid, input.company_name]
      )
      if (r.rowCount === 0) {
        throw new Error(`车位 ${sid} 锁定失败（可能已被占用或非未售状态）`)
      }
    }

    // 3. 同步/更新团购公司主档信息（按公司名 upsert 关键字段）
    const comp = await client.query(
      `SELECT * FROM group_buy_company WHERE company_name = $1`,
      [input.company_name]
    )
    if ((comp.rowCount ?? 0) > 0) {
      const cur = comp.rows[0]
      const oldSpaces = (cur.space_list || '').split(',').filter(Boolean)
      const merged = Array.from(new Set(oldSpaces.concat(input.space_ids)))
      const newCount = merged.length
      const newTotal = parseFloat(cur.total_price || 0) + input.amount
      await client.query(
        `UPDATE group_buy_company
         SET department = COALESCE(NULLIF($1,''), department),
             contact_person = COALESCE(NULLIF($2,''), contact_person),
             phone = COALESCE(NULLIF($3,''), phone),
             space_list = $4,
             space_count = $5,
             total_price = $6,
             is_paid = CASE WHEN $7 THEN TRUE ELSE is_paid END,
             invoice_type = COALESCE(NULLIF($8,''), invoice_type),
             updated_at = NOW()
         WHERE company_id = $9`,
        [
          input.department, input.contact_person, input.contact_phone,
          merged.join(','), newCount, newTotal,
          input.is_paid, input.invoice_type, cur.company_id,
        ]
      )
    }

    return { purchase_id: purchaseId, locked_count: input.space_ids.length }
  })
}

// ==================== 团购核销（公司 → 业主） ====================
export interface GroupVerifyInput {
  company_id: number
  space_id: string
  owner_name: string
  owner_phone: string
  house_key: string
  operator: string
}

export async function verifyGroupBuy(input: GroupVerifyInput) {
  return withTransaction(async (client) => {
    const spaceRes = await client.query(
      `SELECT * FROM parking_spaces WHERE space_id = $1`,
      [input.space_id]
    )
    if (spaceRes.rowCount === 0) throw new Error('车位不存在')
    const space = spaceRes.rows[0]
    if (space.status !== '团购锁定') {
      throw new Error(`车位 ${input.space_id} 不是团购锁定状态`)
    }

    const comp = await client.query(
      `SELECT company_name FROM group_buy_company WHERE company_id = $1`,
      [input.company_id]
    )
    if (comp.rowCount === 0) throw new Error('团购公司不存在')
    const companyName = comp.rows[0].company_name

    // 核销 = 团购锁定车位转让给最终业主 → 状态变为"已售"
    // 保留 is_group_buy=TRUE 与 group_company，以便区分团购来源的已售车位
    await client.query(
      `UPDATE parking_spaces
       SET status = '已售',
           owner_name = $1,
           phone = $2,
           house_key = $3,
           sale_date = NOW(),
           is_group_buy = TRUE,
           group_company = $4,
           updated_at = NOW()
       WHERE space_id = $5`,
      [input.owner_name, input.owner_phone, input.house_key, companyName, input.space_id]
    )

    await client.query(
      `INSERT INTO group_buy_verify_detail
       (company_id, space_id, house_key, owner_name, owner_phone, verify_date, operator)
       VALUES ($1,$2,$3,$4,$5,NOW(),$6)`,
      [
        input.company_id, input.space_id, input.house_key,
        input.owner_name, input.owner_phone, input.operator,
      ]
    )

    await upsertOwner(client, {
      house_key: input.house_key,
      owner_name: input.owner_name,
      phone: input.owner_phone,
      space_id: input.space_id,
      price: space.price || 0,
    })

    return { space_id: input.space_id, status: '已售' }
  })
}

// ==================== 业主信息变更 ====================
export interface UpdateOwnerInput {
  house_key: string
  owner_name: string
  phone: string
  phone2: string
  change_reason: string
  operator: string
}

export async function updateOwnerInfo(input: UpdateOwnerInput) {
  return withTransaction(async (client) => {
    const exist = await client.query(
      `SELECT * FROM owner_info WHERE house_key = $1`,
      [input.house_key]
    )
    if (exist.rowCount === 0) throw new Error(`业主 ${input.house_key} 不存在`)
    const cur = exist.rows[0]

    // 逐字段比对，记录变化
    const changes: { field: string; old: string; neu: string }[] = []
    if ((cur.owner_name || '') !== input.owner_name) {
      changes.push({ field: 'owner_name', old: cur.owner_name || '', neu: input.owner_name })
    }
    if ((cur.phone || '') !== input.phone) {
      changes.push({ field: 'phone', old: cur.phone || '', neu: input.phone })
    }
    if ((cur.phone2 || '') !== (input.phone2 || '')) {
      changes.push({ field: 'phone2', old: cur.phone2 || '', neu: input.phone2 })
    }
    if (changes.length === 0) {
      throw new Error('没有检测到信息变更（姓名/电话/二电话均未改变）')
    }

    // 更新业主信息
    await client.query(
      `UPDATE owner_info
       SET owner_name = $1, phone = $2, phone2 = $3, updated_at = NOW()
       WHERE house_key = $4`,
      [input.owner_name, input.phone, input.phone2, input.house_key]
    )

    // 写变更日志（每个变化字段一条）
    for (const c of changes) {
      await client.query(
        `INSERT INTO owner_info_change_log
         (house_key, owner_name, phone, change_field, old_value, new_value,
          change_reason, operator, changed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
        [
          input.house_key, input.owner_name, input.phone,
          c.field, c.old, c.neu, input.change_reason || '', input.operator,
        ]
      )
    }

    return { changed_fields: changes.map(c => c.field) }
  })
}

// ==================== 后台用户与权限管理 ====================
import bcrypt from 'bcryptjs'

export interface CreateUserInput {
  username: string
  password: string
  display_name: string
  role: number
  permissions: string[]
}

// 新增用户
export async function createUser(input: CreateUserInput) {
  return withTransaction(async (client) => {
    const exist = await client.query(`SELECT 1 FROM admin_user WHERE username = $1`, [input.username])
    if (exist.rowCount && exist.rowCount > 0) throw new Error('用户名已存在')
    const hash = await bcrypt.hash(input.password, 10)
    // role>=2 视为拥有全部权限，permissions 仅对 role=1 生效
    const perms = input.role >= 2 ? '[]' : JSON.stringify(input.permissions)
    const r = await client.query(
      `INSERT INTO admin_user (username, password_hash, display_name, role, permissions)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [input.username, hash, input.display_name || input.username, input.role, perms]
    )
    return { id: r.rows[0].id }
  })
}

// 修改用户角色与权限
export async function updateUserRole(input: { id: number; role: number; permissions: string[]; display_name?: string }) {
  return withTransaction(async (client) => {
    const perms = input.role >= 2 ? '[]' : JSON.stringify(input.permissions)
    await client.query(
      `UPDATE admin_user SET role = $1, permissions = $2, display_name = COALESCE($3, display_name), updated_at = NOW()
       WHERE id = $4`,
      [input.role, perms, input.display_name || null, input.id]
    )
    return { ok: true }
  })
}

// ==================== 打印模板管理 ====================
export async function savePrintTemplate(input: { id?: number; name: string; type: string; content: string }) {
  return withTransaction(async (client) => {
    if (input.id) {
      const r = await client.query(
        `UPDATE print_templates SET name=$1, type=$2, content=$3, updated_at=NOW() WHERE id=$4`,
        [input.name, input.type, input.content, input.id]
      )
      if (!r.rowCount || r.rowCount === 0) throw new Error('模板不存在')
      return { id: input.id }
    }
    const r = await client.query(
      `INSERT INTO print_templates (name, type, content) VALUES ($1,$2,$3) RETURNING id`,
      [input.name, input.type, input.content]
    )
    return { id: r.rows[0]?.id }
  })
}

export async function deletePrintTemplate(id: number) {
  return withTransaction(async (client) => {
    await client.query(`DELETE FROM print_templates WHERE id=$1`, [id])
    return { ok: true }
  })
}

// 重置他人密码
export async function resetUserPassword(input: { id: number; newPassword: string }) {
  return withTransaction(async (client) => {
    const hash = await bcrypt.hash(input.newPassword, 10)
    const r = await client.query(
      `UPDATE admin_user SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hash, input.id]
    )
    if (!r.rowCount || r.rowCount === 0) throw new Error('用户不存在')
    return { ok: true }
  })
}

// 当前用户修改自己的密码
export async function changeMyPassword(input: { userId: number; oldPassword: string; newPassword: string }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT password_hash FROM admin_user WHERE id = $1`,
      [input.userId]
    )
    if (rows.length === 0) throw new Error('用户不存在')
    const ok = await bcrypt.compare(input.oldPassword, rows[0].password_hash)
    if (!ok) throw new Error('原密码不正确')
    const hash = await bcrypt.hash(input.newPassword, 10)
    await client.query(
      `UPDATE admin_user SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hash, input.userId]
    )
    return { ok: true }
  })
}

// ==================== 车位分布图：上传车库图片 ====================
// zone 限定为六个区之一；image_data 为 base64（含 data:image/... 前缀），限制 3MB
export interface UploadGarageMapInput {
  zone: string
  image_data: string   // base64（含 data: 前缀）
  image_name?: string
  uploaded_by?: string
}

const GARAGE_MAP_ZONES = ['A区', 'B区', 'C区', 'D1区', 'D2区', 'E区']
const MAX_MAP_BYTES = 3 * 1024 * 1024

export async function uploadGarageMap(input: UploadGarageMapInput) {
  if (!GARAGE_MAP_ZONES.includes(input.zone)) {
    throw new Error('车库分区不合法，仅支持 A区/B区/C区/D1区/D2区/E区')
  }
  const data = input.image_data || ''
  // 估算 base64 实际字节大小（去掉 data: 前缀与空白）
  const m = data.match(/^data:image\/\w+;base64,(.*)$/)
  if (!m) throw new Error('图片格式不正确（需为 base64 图片）')
  const byteLen = Math.floor((m[1].replace(/\s/g, '').length * 3) / 4)
  if (byteLen > MAX_MAP_BYTES) throw new Error('图片过大，请控制在 3MB 以内')

  return withTransaction(async (client) => {
    // upsert：同一分区覆盖更新
    await client.query(
      `INSERT INTO garage_maps (zone, image_data, image_name, uploaded_by, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (zone) DO UPDATE
       SET image_data = EXCLUDED.image_data,
           image_name = EXCLUDED.image_name,
           uploaded_by = EXCLUDED.uploaded_by,
           updated_at = NOW()`,
      [input.zone, data, input.image_name || null, input.uploaded_by || null]
    )
    return { ok: true, zone: input.zone }
  })
}

// ==================== 车位销售：按车位号查询 ====================
// 返回车位详情（含状态），供销售页面先查询再填写
export async function lookupSpace(spaceId: string): Promise<{
  ok: boolean
  space?: ParkingSpace
  error?: string
}> {
  const sid = (spaceId || '').trim()
  if (!sid) return { ok: false, error: '请输入车位号' }
  const space = await getSpaceById(sid)
  if (!space) return { ok: false, error: `未找到车位「${sid}」` }
  return { ok: true, space }
}

// ==================== 车位调换：按房号查旧车位 / 旧确认单号 ====================
export async function getOwnerSpaces(houseKey: string): Promise<{
  ok: boolean
  spaces?: ParkingSpace[]
  error?: string
}> {
  const key = (houseKey || '').trim()
  if (!key) return { ok: false, error: '请输入房号' }
  const spaces = await getOwnerSoldSpaces(key)
  return { ok: true, spaces }
}

export async function getOldConfirmNo(spaceId: string): Promise<{
  ok: boolean
  receipt_no?: string | null
  error?: string
}> {
  const sid = (spaceId || '').trim()
  if (!sid) return { ok: false, error: '请输入车位号' }
  const receipt_no = await getOldReceiptNo(sid)
  return { ok: true, receipt_no }
}

