// ============ AI 生成 SQL 的安全校验 ============
// 原则：AI 输出不可信。执行前必须过这一层，且数据库层面再用只读事务兜底。

import { AI_ALLOWED_TABLES } from './ai-schema'

const MAX_SQL_LENGTH = 4000
export const AI_MAX_ROWS = 200

// 任何写操作 / DDL / 危险函数 / 系统表探测，一律拒绝
const DANGEROUS_PATTERN =
  /\b(insert|update|delete|drop|alter|truncate|create|replace|grant|revoke|copy|execute|call|do|merge|vacuum|analyze|cluster|reindex|comment|lock|set|reset|begin|commit|rollback|savepoint|prepare|deallocate|refresh|pg_sleep|pg_terminate_backend|pg_cancel_backend|pg_read_file|pg_ls_dir|lo_import|lo_export|dblink|information_schema|pg_catalog|pg_class|pg_proc)\b/i

export type GuardResult =
  | { ok: true; sql: string }
  | { ok: false; reason: string }

/** 提取 SQL 中出现的表名（FROM / JOIN 之后的标识符） */
function extractTables(sql: string): string[] {
  const found = new Set<string>()
  const re = /\b(?:from|join)\s+([a-zA-Z_][\w]*)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(sql))) {
    found.add(m[1].toLowerCase())
  }
  return Array.from(found)
}

/**
 * 校验并规范化 AI 生成的 SQL。
 * 通过时返回可直接执行的 SQL（已确保带 LIMIT）。
 */
export function validateSelectSql(rawSql: string): GuardResult {
  let sql = (rawSql || '').trim()

  if (!sql) return { ok: false, reason: 'AI 未生成 SQL' }
  if (sql.length > MAX_SQL_LENGTH) {
    return { ok: false, reason: `SQL 过长（>${MAX_SQL_LENGTH} 字符），已拒绝执行` }
  }

  // 1) 去掉尾部分号，并禁止多语句拼接
  sql = sql.replace(/;+\s*$/, '').trim()
  if (sql.includes(';')) {
    return { ok: false, reason: '禁止一次执行多条语句' }
  }

  // 2) 禁止注释（防止用注释绕过关键字检测）
  if (sql.includes('--') || sql.includes('/*') || sql.includes('*/')) {
    return { ok: false, reason: 'SQL 中不允许出现注释' }
  }

  // 3) 必须是 SELECT 或 WITH 开头
  if (!/^(select|with)\b/i.test(sql)) {
    return { ok: false, reason: '只允许执行 SELECT 查询' }
  }

  // 4) 危险关键字检测
  const hit = sql.match(DANGEROUS_PATTERN)
  if (hit) {
    return { ok: false, reason: `包含不允许的操作：${hit[1].toUpperCase()}` }
  }

  // 5) 表白名单
  const tables = extractTables(sql)
  if (tables.length === 0) {
    return { ok: false, reason: '未能识别查询的表' }
  }
  const allowed = AI_ALLOWED_TABLES.map(t => t.toLowerCase())
  const illegal = tables.filter(t => !allowed.includes(t))
  if (illegal.length > 0) {
    return { ok: false, reason: `不允许查询的表：${illegal.join('、')}` }
  }

  // 6) 限制返回行数：无 LIMIT 补 200，超过则压到 200
  const limitMatch = sql.match(/\blimit\s+(\d+)/i)
  if (!limitMatch) {
    sql = `${sql} LIMIT ${AI_MAX_ROWS}`
  } else if (Number(limitMatch[1]) > AI_MAX_ROWS) {
    sql = sql.replace(/\blimit\s+\d+/i, `LIMIT ${AI_MAX_ROWS}`)
  }

  return { ok: true, sql }
}
