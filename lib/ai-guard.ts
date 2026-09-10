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
  // 早退阈值放宽到 5：实测 gar_zone 与 garage_zone 长度差 3、编辑距离 3，
  // 阈值太小会直接漏掉这类漏写中间字符的错误
  if (Math.abs(a.length - b.length) > 5) return 99
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
      // 阈值随标识符长度放宽：
      //   arag_zone(9) → garage_zone 距离 2；gar_zone(8) → garage_zone 距离 3
      const maxDist = w.length >= 8 ? 3 : w.length >= 5 ? 2 : 1
      if (d <= maxDist && (!best || d < best.d)) best = { col, d }
    }
    if (best) hints.push(`${raw} → ${best.col}`)
  }
  return hints
}

// 关键字集合：用于拆分 AI 常写的"粘连关键字"（ORDERBY / GROUPBY / ISNOTNULL 等）
const GLUED_KEYWORDS = new Set([
  'SELECT', 'DISTINCT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER',
  'ASC', 'DESC', 'LIMIT', 'OFFSET', 'JOIN', 'INNER', 'LEFT', 'RIGHT',
  'FULL', 'CROSS', 'OUTER', 'ON', 'USING', 'AND', 'OR', 'NOT', 'IS',
  'NULL', 'NULLS', 'FIRST', 'LAST', 'UNION', 'ALL', 'AS', 'IN', 'EXISTS',
  'BETWEEN', 'LIKE', 'ILIKE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
])

/** 递归把粘连的关键字串拆成合法关键字序列；无法完整拆分则返回 null */
function splitGluedTokens(s: string): string[] | null {
  if (GLUED_KEYWORDS.has(s)) return [s]
  // 纯数字：LIMIT1 / LIMIT200 这类"关键字+行数"粘连的结尾部分
  if (/^\d+$/.test(s)) return [s]
  // 阈值 3：循环从 i=2 起、且需要剩下的尾段（≥1 字符），
  // 长度 2 及以下的标识符根本进不了循环，不会误拆（id / zone 等已逐一验证）
  if (s.length < 3) return null
  // 上限用 length-1：允许末尾剩 1 个字符（如 LIMIT1 的 "1"）,
  // 若剩余段不是关键字也不是数字，递归会返回 null 而不会误拆。
  for (let i = 2; i <= s.length - 1; i++) {
    const head = s.slice(0, i)
    if (!GLUED_KEYWORDS.has(head)) continue
    const rest = splitGluedTokens(s.slice(i))
    if (rest) return [head, ...rest]
  }
  return null
}

/**
 * 修复 AI 常见的引号不匹配：WHERE status = '未售" 这类
 * 「以单引号开始、却用双引号结束」的写法会让字符串字面量无法闭合，
 * 导致后续字面量剥离失效，中文被误判成字段名。
 * 只处理「引号之间不含空格/换行」的情况，避免误伤 'x' AS "别名" 这类正常写法。
 */
export function fixMismatchedQuotes(rawSql: string): string {
  return rawSql
    // '未售"  → '未售'
    .replace(/'([^'"\s\n]+)"/g, "'$1'")
    // "未售'  → "未售"
    .replace(/"([^'"\s\n]+)'/g, '"$1"')
}

/**
 * 修复 AI 常见的"关键字粘连"错误：ORDERBY → ORDER BY、GROUPBY → GROUP BY。
 * 这类错误会让 Postgres 报难以理解的 syntax error，直接修掉比重试更省时。
 * 字符串字面量内的内容不处理，避免改变查询语义。
 */
export function fixGluedKeywords(rawSql: string): string {
  const literals: string[] = []
  // 1) 先把字符串 / 双引号别名替换成占位符
  let sql = rawSql.replace(/'(?:[^']|'')*'|"(?:[^"])*"/g, (m) => {
    literals.push(m)
    return `\u0000${literals.length - 1}\u0000`
  })
  // 2) 拆分粘连关键字
  sql = sql.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (word) => {
    const parts = splitGluedTokens(word.toUpperCase())
    if (!parts || parts.length < 2) return word
    return parts.join(' ')
  })
  // 3) 还原字面量
  return sql.replace(/\u0000(\d+)\u0000/g, (_, i) => literals[Number(i)] ?? '')
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

  // 3.1) 修复引号不匹配（如 '未售" → '未售'）。
  //      必须先于关键字修复：字面量若不闭合，后面的字面量识别会整体错位。
  sql = fixMismatchedQuotes(sql)

  // 3.2) 修复粘连关键字（ORDERBY → ORDER BY、GROUPBY → GROUP BY 等）。
  //      必须放在危险关键字检测之前，让规范化后的 SQL 参与后续所有检测：
  //      否则 SELECTDISTINCT、SELECT...INSERTINTO 这类粘连写法中的关键字
  //      因缺少词边界而匹配不到 \bxxx\b，会绕过检测。
  sql = fixGluedKeywords(sql)

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

  // 7) 中文字段名检查
  // 模型常把中文直接当字段名（SELECT 区域 …），Postgres 只会报难以理解的语法错。
  // 中文只允许出现在单引号字符串或 AS 后的双引号别名里。
  const stripped = sql
    .replace(/'(?:[^'])*'/g, "''") // 去掉字符串字面量
    .replace(/"(?:[^"])*"/g, '""') // 去掉双引号别名
  if (/[\u4e00-\u9fa5]/.test(stripped)) {
    // 引号不成对时，字面量剥离必然失败，此时中文多半是"未闭合的字符串值"
    // 而非字段名，给出针对性提示，避免误导排查方向。
    const single = (sql.match(/'/g) || []).length
    const double = (sql.match(/"/g) || []).length
    if (single % 2 !== 0 || double % 2 !== 0) {
      return {
        ok: false,
        reason:
          'SQL 中引号未成对闭合：中文文本必须放在成对的引号里，' +
          "例如 WHERE status = '未售'（不能写成 '未售\" ）；" +
          '字段名必须用英文原名（如 garage_zone），' +
          '中文只能作为字符串值或 AS "区域" 这样的别名出现',
      }
    }
    return {
      ok: false,
      reason:
        'SQL 中出现了中文字段名：字段名必须用英文原名（如 garage_zone）；' +
        '需要中文展示时只能写成 AS "区域" 这样的别名',
    }
  }

  // 8) 限制返回行数：无 LIMIT 补 200，超过则压到 200
  const limitMatch = sql.match(/\blimit\s+(\d+)/i)
  if (!limitMatch) {
    sql = `${sql} LIMIT ${AI_MAX_ROWS}`
  } else if (Number(limitMatch[1]) > AI_MAX_ROWS) {
    sql = sql.replace(/\blimit\s+\d+/i, `LIMIT ${AI_MAX_ROWS}`)
  }

  return { ok: true, sql }
}
