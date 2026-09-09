'use client'

import { useEffect, useRef, useState } from 'react'

type ChatMsg = {
  id: number
  role: 'user' | 'assistant'
  content: string
  sql?: string
  columns?: string[]
  rows?: any[]
  rowCount?: number
  error?: string
  pending?: boolean
}

const SUGGESTIONS = [
  '各区域未售车位数量分别是多少？',
  '已售车位的总金额和平均单价是多少？',
  '购买车位最多的前 10 位业主是谁？',
  '各团购公司核销了多少车位、金额多少？',
  '最近一个月的车位调换记录有哪些？',
  'A区单价最高的 10 个未售车位',
]

let seq = 0
const nextId = () => ++seq

// 平台超时/错误页返回的是 HTML，直接 res.json() 会抛
// "Unexpected token '<'..." 这类看不懂的错误，这里统一转成可读提示
async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text()
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    if (res.status === 504 || res.status === 502 || res.status === 503) {
      throw new Error('请求超时：AI 查询耗时过长被网关中断。请重试，或右上角换一个响应更快的 AI。')
    }
    throw new Error(`服务返回异常（HTTP ${res.status}），通常是函数超时，请重试`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`响应解析失败：${text.slice(0, 120)}`)
  }
}

function fmtCell(v: any, col: string): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? '是' : '否'
  if (typeof v === 'object') return JSON.stringify(v)
  if (typeof v === 'number') {
    if (/金额|价|总额|均价|差价|元/.test(col)) return `¥${v.toLocaleString()}`
    return Number.isInteger(v) ? String(v) : v.toLocaleString()
  }
  const s = String(v)
  // 时间戳精简到分钟
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.slice(0, 16).replace('T', ' ')
  return s
}

function downloadCsv(columns: string[], rows: any[]) {
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [columns.map(esc).join(','), ...rows.map(r => columns.map(c => esc(r[c])).join(','))].join('\n')
  // BOM 保证 Excel 打开中文不乱码
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `AI查询_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function ResultTable({ columns, rows }: { columns: string[]; rows: any[] }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? rows : rows.slice(0, 20)

  if (!rows.length) {
    return <div className="text-sm text-gray" style={{ padding: '12px 0' }}>未查询到符合条件的数据</div>
  }

  return (
    <div>
      <div style={{ overflowX: 'auto', maxHeight: expanded ? 460 : 320, overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} style={{ whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>
                {columns.map((c, j) => (
                  <td key={j} style={{ whiteSpace: 'nowrap' }}>{fmtCell(r[c], c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex" style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <span className="text-xs text-gray">共 {rows.length} 行</span>
        <div className="flex" style={{ gap: 8 }}>
          {rows.length > 20 && (
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 13, padding: '4px 12px' }}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '收起' : `展开全部 ${rows.length} 行`}
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: 13, padding: '4px 12px' }}
            onClick={() => downloadCsv(columns, rows)}
          >
            导出 CSV
          </button>
        </div>
      </div>
    </div>
  )
}

function SqlBlock({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* 剪贴板不可用时忽略 */
    }
  }

  return (
    <details style={{ marginBottom: 10 }}>
      <summary className="text-xs text-gray" style={{ cursor: 'pointer' }}>
        查看生成的 SQL
      </summary>
      <div style={{ position: 'relative', marginTop: 6 }}>
        <pre
          style={{
            background: '#f6f8fa',
            border: '1px solid #eee',
            borderRadius: 6,
            padding: '10px 12px',
            fontSize: 13,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {sql}
        </pre>
        <button
          type="button"
          className="btn-secondary"
          style={{ fontSize: 12, padding: '2px 10px', marginTop: 6 }}
          onClick={copy}
        >
          {copied ? '已复制' : '复制 SQL'}
        </button>
      </div>
    </details>
  )
}

type AiOption = { id: number; name: string; model: string; provider: string; is_default: boolean }

export default function AiChat() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // 可选 AI 列表（来自数据库 ai_config）
  const [options, setOptions] = useState<AiOption[]>([])
  const [configId, setConfigId] = useState<number | null>(null)
  const [envFallback, setEnvFallback] = useState<{ name: string; model: string } | null>(null)
  const [optLoading, setOptLoading] = useState(true)

  // 加载可选 AI，默认选中标记了 is_default 的那条
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/ai/configs')
        const data = await res.json()
        if (!alive) return
        if (data.ok) {
          const list: AiOption[] = data.configs || []
          setOptions(list)
          setEnvFallback(data.envFallback || null)
          const def = list.find(c => c.is_default)
          if (def) setConfigId(def.id)
          else if (list.length > 0) setConfigId(list[0].id)
        }
      } catch {
        /* 加载失败时保持空列表，仍可走环境变量兜底 */
      } finally {
        if (alive) setOptLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  async function send(text: string) {
    const q = text.trim()
    if (!q || loading) return

    const userMsg: ChatMsg = { id: nextId(), role: 'user', content: q }
    const pendingMsg: ChatMsg = { id: nextId(), role: 'assistant', content: '', pending: true }
    const history = [...msgs, userMsg]
      .filter(m => !m.pending && !m.error)
      .map(m => ({ role: m.role, content: m.content }))

    setMsgs(prev => [...prev, userMsg, pendingMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history, configId }),
      })
      const data = await parseJsonSafe(res)
      if (!data?.ok) {
        // 带上后端返回的 SQL，便于在错误里直接看到 AI 生成了什么
        const err: any = new Error(data?.error || `查询失败（HTTP ${res.status}）`)
        err.sql = data?.sql
        throw err
      }

      setMsgs(prev =>
        prev.map(m =>
          m.id === pendingMsg.id
            ? {
                ...m,
                pending: false,
                content: '查询完成，见下方结果。',
                sql: data.sql,
                columns: data.columns,
                rows: data.rows,
                rowCount: data.rowCount,
              }
            : m
        )
      )

      // 解读走独立请求：慢或失败都不影响数据展示
      fetchSummary(pendingMsg.id, q, data.sql, data.columns, data.rows, configId)
    } catch (err) {
      const e = err as any
      setMsgs(prev =>
        prev.map(m =>
          m.id === pendingMsg.id
            ? { ...m, pending: false, error: e?.message || '查询失败', sql: e?.sql }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }

  // 结果解读：独立请求，失败静默降级（保留默认文案）
  async function fetchSummary(
    id: number,
    question: string,
    sql: string,
    columns: string[],
    rows: any[],
    cfgId: number | null
  ) {
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sql, columns, rows, configId: cfgId }),
      })
      const data = await parseJsonSafe(res)
      if (data?.ok && data.summary) {
        setMsgs(prev => prev.map(m => (m.id === id ? { ...m, content: data.summary } : m)))
      }
    } catch {
      // 解读失败不打扰用户
    }
  }

  function clearAll() {
    setMsgs([])
    setInput('')
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>🤖 AI 智能问数</h3>
          <p className="text-xs text-gray">用中文描述你想统计的内容，AI 自动生成 SQL 并读取数据库（只读）</p>
        </div>
        <div className="flex" style={{ gap: 8, flexShrink: 0 }}>
          <select
            className="select"
            style={{ width: 'auto', minWidth: 190, fontSize: 13, padding: '4px 8px' }}
            value={configId ?? ''}
            disabled={optLoading || loading || options.length === 0}
            onChange={e => setConfigId(e.target.value ? Number(e.target.value) : null)}
            title="选择使用的 AI"
          >
            {options.length === 0 ? (
              <option value="">{optLoading ? '加载 AI 列表…' : '暂无可用 AI'}</option>
            ) : (
              options.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name}{o.model ? ` · ${o.model}` : ''}
                </option>
              ))
            )}
          </select>
          {msgs.length > 0 && (
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 13, padding: '4px 12px' }}
              onClick={clearAll}
            >
              清空对话
            </button>
          )}
        </div>
      </div>

      {!optLoading && options.length === 0 && (
        <div className="text-xs" style={{ marginBottom: 12, color: '#fa8c16' }}>
          {envFallback
            ? `数据库暂无 AI 配置，将使用环境变量兜底（${envFallback.model || '默认模型'}）`
            : '尚未配置 AI：请到「用户与角色 → AI 配置」添加，或设置环境变量 AI_API_KEY'}
        </div>
      )}

      {/* 快捷问题 */}
      <div className="flex" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            type="button"
            className="btn-secondary"
            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12 }}
            disabled={loading}
            onClick={() => send(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* 消息列表 */}
      <div
        ref={listRef}
        style={{
          minHeight: 240,
          maxHeight: 520,
          overflowY: 'auto',
          background: '#fafafa',
          border: '1px solid #eee',
          borderRadius: 8,
          padding: 12,
        }}
      >
        {msgs.length === 0 && (
          <div className="text-sm text-gray text-center" style={{ padding: '60px 20px' }}>
            还没有对话，试试上方的快捷问题，或直接输入你想查的内容
          </div>
        )}

        {msgs.map(m =>
          m.role === 'user' ? (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <div
                style={{
                  background: '#1677ff',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '10px 10px 2px 10px',
                  maxWidth: '78%',
                  fontSize: 14,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #eee',
                  padding: '10px 12px',
                  borderRadius: '10px 10px 10px 2px',
                  maxWidth: '92%',
                  minWidth: 240,
                  fontSize: 14,
                }}
              >
                {m.pending && (
                  <span className="text-gray">
                    正在分析并查询数据库
                    <span className="dots">…</span>
                  </span>
                )}

                {m.error && (
                  <>
                    <span className="text-red">{m.error}</span>
                    {m.sql && <SqlBlock sql={m.sql} />}
                  </>
                )}

                {!m.pending && !m.error && (
                  <>
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 8 }}>
                      {m.content}
                    </div>
                    {m.sql && <SqlBlock sql={m.sql} />}
                    {m.columns && m.rows && <ResultTable columns={m.columns} rows={m.rows} />}
                  </>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* 输入区 */}
      <div className="flex" style={{ marginTop: 12, alignItems: 'flex-end', gap: 8 }}>
        <textarea
          className="input"
          rows={2}
          placeholder="例如：统计各区域已售车位的数量和总金额（Enter 发送，Shift+Enter 换行）"
          value={input}
          disabled={loading}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          style={{ resize: 'vertical', minHeight: 46 }}
        />
        <button
          type="button"
          className="btn-primary"
          style={{ flexShrink: 0, height: 46 }}
          disabled={loading || !input.trim()}
          onClick={() => send(input)}
        >
          {loading ? '查询中…' : '发送'}
        </button>
      </div>
    </div>
  )
}
