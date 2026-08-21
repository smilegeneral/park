'use client'
import { useEffect, useRef, useState } from 'react'
import { savePrintTemplate } from '@/lib/actions'
import {
  DOC_FIELDS, DOC_TITLES, DEFAULT_SALE_HTML, DEFAULT_SWAP_HTML, sampleValues,
  type DocType,
} from '@/app/dashboard/components/doc-templates'

// 打印模板允许的标签白名单（防止 dangerouslySetInnerHTML 触发 XSS：
// 业主数据/编辑内容中的 <script>、on* 事件、javascript: 协议等都会被剥离）
const ALLOWED_TAGS = new Set([
  'P', 'DIV', 'SPAN', 'BR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH',
  'COLGROUP', 'COL', 'H2', 'H1', 'H3', 'B', 'I', 'U', 'UL', 'OL', 'LI', 'STYLE',
])
const ALLOWED_ATTRS = new Set(['class', 'style', 'colspan', 'rowspan', 'width', 'align'])

// 轻量 DOM 净化（仅客户端运行，具备完整 DOM API）
function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') return dirty
  const doc = new DOMParser().parseFromString(dirty, 'text/html')

  const walk = (node: Element) => {
    // 倒序遍历子节点，便于安全删除
    const children = Array.from(node.children)
    for (const child of children) {
      const tag = child.tagName.toUpperCase()
      if (!ALLOWED_TAGS.has(tag)) {
        child.remove()
        continue
      }
      // 剥离危险属性（事件处理器、javascript: 协议、非白名单属性）
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase()
        const val = attr.value.toLowerCase()
        const dangerous =
          name.startsWith('on') ||
          !ALLOWED_ATTRS.has(name) ||
          val.includes('javascript:') ||
          val.includes('data:')
        if (dangerous) child.removeAttribute(attr.name)
      }
      walk(child)
    }
  }
  walk(doc.body)
  return doc.body.innerHTML
}

// ============================================================
//  可视化单据编辑器（类似 Word）
//  - contentEditable 编辑区 + 富文本工具栏
//  - 可插入字段占位符（整体不可编辑，避免误拆）
//  - 保存为打印模板（print_templates, type=sale/swap）
//  - 预览打印：用示例值替换占位符后打印
// ============================================================

export default function DocEditor({
  type,
  initialHtml,
  templateId,
  sampleData,
}: {
  type: DocType
  initialHtml?: string
  templateId?: number
  sampleData: any[]
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [html, setHtml] = useState(initialHtml || (type === 'sale' ? DEFAULT_SALE_HTML : DEFAULT_SWAP_HTML))
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (editorRef.current && !initialized.current) {
      editorRef.current.innerHTML = html
      initialized.current = true
    }
  }, [html])

  const fields = DOC_FIELDS[type]
  const defaultHtml = type === 'sale' ? DEFAULT_SALE_HTML : DEFAULT_SWAP_HTML

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
  }

  // 在光标处插入字段占位符（整体不可编辑）
  function insertField(key: string) {
    const token = `<span class="field-token" contenteditable="false">{{${key}}}</span>`
    editorRef.current?.focus()
    document.execCommand('insertHTML', false, token + '&nbsp;')
  }

  // ---- 表格编辑（基于选区的原生 DOM 操作，兼容现代浏览器）----
  function getSelectedTable(): HTMLTableElement | null {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    let node: Node | null = sel.anchorNode
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLTableElement) return node
      node = node.parentNode
    }
    return null
  }
  function getSelectedCell(): HTMLTableCellElement | null {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    let node: Node | null = sel.anchorNode
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLTableCellElement) return node
      node = node.parentNode
    }
    return null
  }

  // 在光标处插入表格
  function insertTable(rows = 3, cols = 3) {
    editorRef.current?.focus()
    let html = '<table class="doc-table">'
    for (let r = 0; r < rows; r++) {
      html += '<tr>'
      for (let c = 0; c < cols; c++) html += '<td>&nbsp;</td>'
      html += '</tr>'
    }
    html += '</table><p>&nbsp;</p>'
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      const div = document.createElement('div')
      div.innerHTML = html
      const frag = document.createDocumentFragment()
      let last: Node | null = null
      while (div.firstChild) { last = div.firstChild; frag.appendChild(div.firstChild) }
      range.deleteContents()
      range.insertNode(frag)
      // 光标移到表格后
      if (last) {
        const newRange = document.createRange()
        newRange.setStartAfter(last)
        newRange.collapse(true)
        sel.removeAllRanges()
        sel.addRange(newRange)
      }
    } else {
      document.execCommand('insertHTML', false, html)
    }
  }

  function addRow() {
    const cell = getSelectedCell()
    if (!cell) { alert('请先将光标置于要插入行下方的表格单元格内'); return }
    const tr = cell.parentElement as HTMLTableRowElement
    const newTr = document.createElement('tr')
    const colCount = tr.children.length
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement('td')
      td.innerHTML = '&nbsp;'
      newTr.appendChild(td)
    }
    tr.parentNode?.insertBefore(newTr, tr.nextSibling)
  }

  function removeRow() {
    const cell = getSelectedCell()
    if (!cell) { alert('请先将光标置于要删除的表格行内'); return }
    const tr = cell.parentElement as HTMLTableRowElement
    const table = tr.closest('table')
    if (table && table.rows.length <= 1) { table.remove(); return }
    tr.remove()
  }

  function addColumn() {
    const cell = getSelectedCell()
    if (!cell) { alert('请先将光标置于要插入列右侧的表格单元格内'); return }
    const tr = cell.parentElement as HTMLTableRowElement
    const colIndex = Array.from(tr.children).indexOf(cell)
    const table = tr.closest('table')
    if (!table) return
    Array.from(table.rows).forEach((row: HTMLTableRowElement) => {
      const refCell = row.children[colIndex] as HTMLTableCellElement
      const newTd = document.createElement(row.parentElement?.tagName === 'THEAD' ? 'th' : 'td')
      newTd.innerHTML = '&nbsp;'
      if (refCell) row.insertBefore(newTd, refCell.nextSibling)
      else row.appendChild(newTd)
    })
  }

  function removeColumn() {
    const cell = getSelectedCell()
    if (!cell) { alert('请先将光标置于要删除的表格列内'); return }
    const tr = cell.parentElement as HTMLTableRowElement
    const colIndex = Array.from(tr.children).indexOf(cell)
    const table = tr.closest('table')
    if (!table) return
    if (table.rows[0] && table.rows[0].children.length <= 1) { table.remove(); return }
    Array.from(table.rows).forEach((row: HTMLTableRowElement) => {
      const c = row.children[colIndex]
      if (c) c.remove()
    })
  }

  function removeTable() {
    const t = getSelectedTable()
    if (!t) { alert('光标未在表格内'); return }
    t.remove()
  }

  async function handleSave() {
    if (!editorRef.current) return
    const content = editorRef.current.innerHTML
    setSaving(true)
    const res = await savePrintTemplate({
      id: templateId,
      name: DOC_TITLES[type],
      type,
      content,
    })
    setSaving(false)
    if (res && 'id' in res) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  function handlePreview() {
    if (!editorRef.current) return
    const content = editorRef.current.innerHTML
    const vals = sampleValues(type, sampleData)
    let out = content
    for (const [k, v] of Object.entries(vals)) {
      out = out.split(`{{${k}}}`).join(v || '')
    }
    // 移除未替换的占位符高亮样式，仅保留文本
    out = out.replace(/<span class="field-token"[^>]*>\{\{([^}]+)\}\}<\/span>/g, '{{$1}}')
    // 净化后渲染，防止业主数据/编辑内容触发的 XSS
    setPreviewHtml(sanitizeHtml(out))
    setTimeout(() => window.print(), 120)
  }

  function handleReset() {
    if (!confirm('确定恢复为默认模板？当前编辑内容将丢失。')) return
    if (editorRef.current) editorRef.current.innerHTML = defaultHtml
    setPreviewHtml(null)
  }

  const toolbarBtn: React.CSSProperties = {
    border: '1px solid #d9d9d9', background: '#fff', borderRadius: 4,
    padding: '4px 8px', fontSize: 13, cursor: 'pointer', minWidth: 30,
  }

  return (
    <div>
      {/* 工具栏 */}
      <div className="flex no-print" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <button type="button" style={toolbarBtn} onClick={() => exec('bold')}><b>B</b></button>
        <button type="button" style={toolbarBtn} onClick={() => exec('italic')}><i>I</i></button>
        <button type="button" style={toolbarBtn} onClick={() => exec('underline')}><u>U</u></button>
        <select style={{ ...toolbarBtn, minWidth: 60 }} onChange={e => { if (e.target.value) { exec('fontSize', e.target.value); e.target.value = '' } }} defaultValue="">
          <option value="">字号</option>
          <option value="3">小</option>
          <option value="4">中</option>
          <option value="6">大</option>
          <option value="7">特大</option>
        </select>
        <button type="button" style={toolbarBtn} onClick={() => exec('justifyLeft')}>⬅</button>
        <button type="button" style={toolbarBtn} onClick={() => exec('justifyCenter')}>⬌</button>
        <button type="button" style={toolbarBtn} onClick={() => exec('justifyRight')}>➡</button>
        <button type="button" style={toolbarBtn} onClick={() => exec('insertUnorderedList')}>• 列表</button>
        <button type="button" style={toolbarBtn} onClick={() => exec('removeFormat')}>清除格式</button>
        <span style={{ width: 1, height: 22, background: '#ddd' }} />
        {/* 表格编辑 */}
        <span style={{ fontSize: 13, color: '#555' }}>表格：</span>
        <button type="button" style={toolbarBtn} onClick={() => insertTable(3, 3)} title="插入 3×3 表格">⊞ 插入</button>
        <button type="button" style={toolbarBtn} onClick={addRow} title="在下方插入行">＋行</button>
        <button type="button" style={toolbarBtn} onClick={removeRow} title="删除当前行">－行</button>
        <button type="button" style={toolbarBtn} onClick={addColumn} title="在右侧插入列">＋列</button>
        <button type="button" style={toolbarBtn} onClick={removeColumn} title="删除当前列">－列</button>
        <button type="button" style={toolbarBtn} onClick={removeTable} title="删除整个表格">🗑 表格</button>
        <span style={{ width: 1, height: 22, background: '#ddd' }} />
        <label style={{ fontSize: 13, color: '#555' }}>
          插入字段：
          <select style={{ ...toolbarBtn, minWidth: 120 }} defaultValue="" onChange={e => { if (e.target.value) { insertField(e.target.value); e.target.value = '' } }}>
            <option value="">选择…</option>
            {fields.map(([k, label]) => (
              <option key={k} value={k}>{label}（{`{{${k}}}`}）</option>
            ))}
          </select>
        </label>
      </div>

      {/* 编辑区（类似 Word） */}
      <div
        ref={editorRef}
        className="doc-editor"
        contentEditable
        suppressContentEditableWarning
        style={{
          border: '1px solid #d9d9d9', borderRadius: 6, minHeight: 360,
          padding: 20, background: '#fff', fontFamily: '"SimSun","宋体",serif',
          fontSize: 15, lineHeight: 1.7, outline: 'none',
        }}
      />

      {/* 操作按钮 */}
      <div className="flex no-print" style={{ gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving} style={{ fontSize: 13 }}>
          {saving ? '保存中…' : '💾 保存模板'}
        </button>
        <button type="button" className="btn-success" onClick={handlePreview} style={{ fontSize: 13 }}>
          🖨️ 预览打印
        </button>
        <button type="button" className="btn-ghost" onClick={handleReset} style={{ fontSize: 13 }}>
          ↺ 恢复默认
        </button>
        {saved && <span style={{ color: '#52c41a', fontSize: 13 }}>✅ 已保存</span>}
      </div>

      {/* 打印预览区 */}
      {previewHtml && (
        <div className="print-area" style={{ marginTop: 16 }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
      )}
    </div>
  )
}
