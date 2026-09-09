// ============ AI 生成 SQL 的安全校验 ============
// 原则：AI 输出不可信。执行前必须过这一层，且数据库层面再用只读事务兜底。

import { AI_ALLOWED_TABLES, AI_KNOWN_COLUMNS } from './ai-schema'

// SQL 关键字与常用函数：避免被误判成拼错的字段名
const SQL_NOISE = new Set([
  'select', 'from', 'where', 'group', 'order', 'limit', 'offset', 'having',
  'distinct', 'count', 'sum', 'avg', 'coalesce', 'round', 'cast', 'numeric',
  'integer', 'text', 'interval', 'extract', 'string_agg', 'array_agg',
  'to_char', 'date_trunc', 'false', 'true', 'between', 'exists', 'union',
  'inner', 'outer', 'desc', 'null', 'like', 'ilike', 'when', 'then', 'else',
])

/** 编辑距离（只关心 <=2 的差异，超过直接返回大值以提速） */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > 2) return 99
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let cur = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const next = Math.min(prev[j] + 1, cur + 1, prev[j - 1] + cost)
      prev[j - 1] = cur
      cur = next
    }
    prev[b.length] = cur
  }
  return prev[b.length]
}

/**
 * 找出疑似拼错的字段名（与已知字段编辑距离为 1）。
 * 例：arag_zone → garage_zone
 */
function findColumnTypos(sql: string): string[] {
  const known = Array.from(new Set(AI_KNOWN_COLUMNS.map(c => c.toLowerCase())))
  const idents = sql.match(/[a-z_][a-z0-9_]*/gi) || []
  const seen = new Set<string>()
  const hints: string[] = []

  for (const raw of idents) {
    const w = raw.toLowerCase()
    // 过短标识符多为表别名（p/o/t1），不参与判断，避免误报
    if (w.length < 5) continue
    if (known.includes(w) || SQL_NOISE.has(w) || seen.has(w)) continue
    seen.add(w)

    let best: { col: string; d: number } | null = null
    for (const col of known) {
      const d = levenshtein(w, col)
      // 阈值随字段长度放宽：长字段允许 2 处差异
      // （实测 arag_zone ↔ garage_zone 距离为 2，固定阈值 1 会漏掉）
      const maxDist = Math.max(1, Math.floor(Math.min(w.length, col.length) / 4))
      if (d <= maxDist && (!best || d < best.d)) best = { col, d }
    }
    if (best) hints.push(`${raw} → ${best.col}`)
  }
  return hints
}

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

  // 6) 字段名拼写检查：小模型常写漏一个字母，提前拦下并提示正确字段名
  const typos = findColumnTypos(sql)
  if (typos.length > 0) {
    return {
      ok: false,
      reason: `字段名疑似拼写错误：${typos.join('；')}。请使用正确的字段名重写`,
    }
  }

  // 7) 限制返回行数：无 LIMIT 补 200，超过则压到 200
  const limitMatch = sql.match(/\blimit\s+(\d+)/i)
  if (!limitMatch) {
    sql = `${sql} LIMIT ${AI_MAX_ROWS}`
  } else if (Number(limitMatch[1]) > AI_MAX_ROWS) {
    sql = sql.replace(/\blimit\s+\d+/i, `LIMIT ${AI_MAX_ROWS}`)
  }

  return { ok: true, sql }
}
