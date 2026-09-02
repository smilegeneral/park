// ============================================================
// 根据实际 Aiven 数据库表结构定义的 TypeScript 类型
// CSV 来源：group_buy_company / owner_info / parking_spaces
//           parking_sales_records / parking_space_change_log
//           owner_info_change_log / group_buy_verify_detail
// ============================================================

// 团购部门常用值：仅作为前端下拉/输入建议（部门支持手工输入任意值）。
// 数据库侧仅要求非空，不再限定这三个值。
export const GROUP_BUY_DEPARTMENTS = [
  '莱山分公司',
  '开发分公司',
  '建设分公司',
] as const

export type GroupBuyDepartment = (typeof GROUP_BUY_DEPARTMENTS)[number]

// 团购单号：TG + 三位数字（与购买记录 purchase_id 对应）。
// 团购登记产生的车位变更单号直接沿用此号，不再使用 GBP-时间戳 这类长单号。
export function groupBuyOrderNo(purchaseId: number | string): string {
  return `TG${String(purchaseId).padStart(3, '0')}`
}

// 团购核销单号：GCV + 三位数字（与核销明细 verify_id 对应）。
// 团购核销产生的车位变更单号沿用此号，不再使用 GBV-时间戳 这类长单号。
export function groupBuyVerifyOrderNo(verifyId: number | string): string {
  return `GCV${String(verifyId).padStart(3, '0')}`
}

// ---------- 车位主表 parking_spaces ----------
export interface ParkingSpace {
  space_id: string          // 车位编号，如 A-001, B-287
  garage_zone: string      // 区域：A区/B区/C区/D区
  space_num: string        // 车位数字编号
  status: SpaceStatus      // 未售/已售/团购锁定/已核销/零售锁定
  space_type: string       // 普通车位/子母车位等
  building_no: string      // 楼栋号
  unit_no: string          // 单元号
  room_no: string          // 房间号
  house_key: string        // 楼栋-单元-房间 组合键，如 1-1-101
  employee_name: string    // 内部经办人
  owner_name: string       // 业主姓名（可能多人用/分隔）
  phone: string            // 联系电话
  booker_name: string      // 预订人
  booker_phone: string     // 预订联系电话
  price: number            // 车位价格
  sale_date: string        // 销售日期
  receipt_no: string       // 收据编号
  confirm_no: string       // 确认书编号
  remarks: string          // 备注
  is_group_buy: boolean    // 是否团购
  group_company: string    // 团购公司名
  created_at: string
  updated_at: string
}

export type SpaceStatus =
  | '未售'
  | '预订'
  | '已售'
  | '团购锁定'
  | '已核销'
  | '取消'

// ---------- 业主信息表 owner_info ----------
export interface OwnerInfo {
  house_key: string        // 主键，如 1-1-101
  building_no: string
  unit_no: string
  room_no: string
  building_unit_room: string
  owner_name: string       // 可能多人，"王冰/王浩宇"
  phone: string
  phone2: string           // 第二联系电话
  parking_count: number    // 拥有车位数
  parking_spaces: string   // 拥有的车位编号，逗号分隔
  change_record: string    // 变更记录
  parking_price: number   // 车位总价
  created_at: string
  updated_at: string
}

// ---------- 团购公司表 group_buy_company ----------
export interface GroupBuyCompany {
  company_id: number
  company_name: string
  department: string       // 分公司/部门
  contact_person: string
  phone: string
  space_count: number      // 购买车位数
  space_list: string       // 车位列表，逗号分隔
  total_price: number
  remarks: string
  created_at: string
  updated_at: string
  is_paid: boolean
  invoice_type: string     // 发票类型：专票/普票/普票个人/未开票
}

// ---------- 团购公司购买记录表 group_buy_purchase ----------
export interface GroupBuyPurchase {
  purchase_id: number
  company_name: string
  department: string
  contact_person: string
  contact_phone: string
  space_count: number
  space_list: string
  amount: number
  is_paid: boolean
  invoice_type: string     // 专票/普票/普票个人/未开票
  remarks: string
  operator: string
  created_at: string
  updated_at: string
}

// ---------- 团购核销明细表 group_buy_verify_detail ----------
export interface GroupBuyVerifyDetail {
  verify_id: number
  company_id: number | null
  company_name: string | null
  space_id: string | null
  house_key: string | null
  owner_name: string | null
  owner_phone: string | null
  sale_amount: number
  receipt_no: string | null
  verify_date: string | null
  operator: string | null
  remarks: string | null
  created_at: string
}

// ---------- 团购统计结果 ----------
export interface GroupBuyStat {
  dim_key: string         // 部门名 或 公司名
  total_spaces: number   // 已售（购买）车位数
  total_amount: number   // 总金额
  paid_spaces: number    // 已付款车位数
  paid_amount: number    // 已付款金额
  unpaid_spaces: number  // 未付款车位数
  unpaid_amount: number  // 未付款金额
}

// ---------- 车位销售记录表 parking_sales_records ----------
export interface ParkingSaleRecord {
  record_id: number
  sale_order_no: string
  space_no: string
  space_type: string
  room_no: string
  house_key: string
  owner_name: string
  phone: string
  amount: number
  sale_time: string
  receipt_no: string
  confirmation_no: string
  is_group_buy: string     // 数据库为 varchar：'是' / '否'
  group_company: string
  remarks: string
  status: string           // 草稿/锁定/已确认/已作废
  created_at: string
  updated_at: string
  process_result: string
  preview_url: string
}

// ---------- 车位调换日志 parking_space_change_log ----------
export interface SpaceChangeLog {
  log_id: number
  owner_name: string
  phone: string
  old_space_no: string
  old_space_type: string
  old_house_key: string
  old_space_price: number
  new_space_no: string
  new_space_type: string
  new_house_key: string
  new_space_price: number
  price_difference: number
  swap_type: string        // 加钱换车位/平换车位（受 parking_space_change_log 表 CHECK 约束）
  change_reason: string
  receipt_no: string
  new_receipt_no: string
  operator: string
  changed_at: string
  remarks: string
  process_result: string
  employee_name: string
  preview_url: string
  swap_order_no: string
}

// ---------- 业主信息变更日志 owner_info_change_log ----------
export interface OwnerChangeLog {
  log_id: number
  house_key: string
  owner_name: string
  phone: string
  change_field: string     // 变更字段名
  old_value: string
  new_value: string
  change_reason: string
  operator: string
  changed_at: string
}

// ---------- 团购核销明细 group_buy_verify_detail ----------
export interface GroupBuyVerify {
  verify_id: number
  company_id: number
  space_id: string
  house_key: string
  owner_name: string
  owner_phone: string
  verify_date: string
  operator: string
  remarks: string
  created_at: string
}

// ---------- 销控统计（仪表盘用） ----------
export interface SpaceStats {
  total: number            // 总车位
  unsold: number           // 未售
  sold: number             // 已售
  retail_locked: number    // 零售锁定
  group_locked: number     // 团购锁定
  group_verified: number   // 团购已售（团购核销后转为已售的车位）
  cancelled: number        // 取消车位数
}

// ---------- 打印模板 ----------
export interface PrintTemplate {
  id: number
  name: string
  type: string          // query / sale / booking
  content: string       // HTML 模板，含 {{字段}} 占位符
  created_at?: string
}

// ---------- 车位查询参数 ----------
export interface SpaceSearchParams {
  space_id?: string
  garage_zone?: string
  building_no?: string
  unit_no?: string
  status?: string
  owner_name?: string
  phone?: string
  house_key?: string
  space_type?: string
}

// ---------- 后台用户 admin_user ----------
// role: 1=销售(普通) 2=管理员 3=超级管理员
// permissions: 功能权限码数组（role>=2 视为全权限）
export type Permission =
  | 'spaces'     // 销控图/车位查询
  | 'sale'       // 车位销售
  | 'group'      // 团购管理
  | 'swap'       // 车位调换
  | 'owners'     // 业主信息
  | 'users'      // 用户/角色管理
  | 'print'      // 表单打印

export interface AdminUser {
  id: number
  username: string
  display_name: string
  role: number
  permissions: string[]   // 仅 role=1 时生效
  created_at?: string
}

export const ALL_PERMISSIONS: { code: Permission; label: string }[] = [
  { code: 'spaces', label: '销控图 / 车位查询' },
  { code: 'sale', label: '车位销售' },
  { code: 'group', label: '团购管理' },
  { code: 'swap', label: '车位调换' },
  { code: 'owners', label: '业主信息变更' },
  { code: 'users', label: '用户与角色管理' },
  { code: 'print', label: '表单打印' },
]

export const ROLE_LABELS: Record<number, string> = {
  0: '访客',
  1: '销售员',
  2: '管理员',
  3: '超级管理员',
}

// ---------- 报表统计结果 ----------
export interface ZoneUnsoldStat {
  garage_zone: string
  unsold_count: number
}
export interface TopOwnerStat {
  owner_name: string
  building_no: string
  unit_no: string
  room_no: string
  house_key: string
  space_count: number
  total_amount: number
}
export interface NotBoughtOwnerStat {
  house_key: string
  building_no: string
  unit_no: string
  room_no: string
  owner_name: string
  phone: string
}
export interface ReportSummary {
  total_sold_amount: number          // 已售总金额（含已售/已核销/团购锁定）
  total_sold_count: number           // 已售车位总数（含已售/已核销/团购锁定）
  total_unsold: number               // 未售车位总数
  group_verified_count: number       // 团购已核销（已售）车位数
}

// ---------- 按车库（区域）统计 ----------
export interface ZoneStat {
  garage_zone: string        // 车库区域
  total: number              // 车位总数
  sold_count: number         // 已售车位数（已售/已核销/团购锁定）
  sold_amount: number        // 已售金额（已售/已核销/团购锁定 的 price 之和）
  unsold_count: number       // 未收（未售）车位数
  unsold_sub: number         // 未收中：子母车位
  unsold_single: number      // 未收中：单体车位
  unsold_normal: number      // 未收中：普通车位
  unsold_other: number       // 未收中：其他类型
}

// ---------- 车库分区（车位分布图使用的六个区） ----------
export const GARAGE_ZONES: string[] = ['A区', 'B区', 'C区', 'D1区', 'D2区', 'E区']

// ---------- 车库分布图图片 garage_maps ----------
export interface GarageMap {
  id: number
  zone: string            // A区/B区/C区/D1区/D2区/E区
  image_url: string | null   // 对象存储公开 URL（R2）
  image_name: string | null
  uploaded_by: string | null
  created_at?: string
  updated_at?: string
}
