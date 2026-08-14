'use client'
import { useState, useTransition } from 'react'
import { savePrintTemplate, deletePrintTemplate } from '@/lib/actions'
import DocEditor from '@/app/dashboard/print/doc-editor'
import { DOC_TITLES } from '@/app/dashboard/components/doc-templates'

// ============================================================
//  表单打印中心
//  - 模板管理：新建/编辑打印模板（HTML + {{字段}} 占位符）
//    · 支持上传 DOC/Excel/HTML/TXT：读取文件文本作为模板基础内容
//  - 打印预览：用示例车位数据替换占位符，浏览器打印
// ============================================================

const TYPES = [
  { code: 'query', label: '车位查询表单' },
  { code: 'sale', label: '车位销售单' },
  { code: 'booking', label: '车位预订单' },
]

// 字段说明（模板中可用 {{字段}}）
const FIELD_HINT = '可用字段：{{space_id}} {{garage_zone}} {{building_no}} {{space_type}} {{status}} {{owner_name}} {{phone}} {{house_key}} {{price}} {{booker_name}} {{booker_phone}}'

export default function PrintCenter({
  templates,
  sampleData,
}: {
  templates: any[]
  sampleData: any[]
}) {
  const [editing, setEditing] = useState<any | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [previewTpl, setPreviewTpl] = useState<any | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [docType, setDocType] = useState<'sale' | 'swap'>('sale')

  return (
    <div>
      {/* 业务单据模板可视化编辑 */}
      <div className="card" style={{ padding: 16, marginBottom: 18 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>📝 修改业务单据模板（可视化）</h3>
        <p className="text-xs text-gray" style={{ marginBottom: 12 }}>
          在下方编辑区直接修改文字样式，或使用「插入字段」添加数据占位符；保存后可用于实际业务单据打印。
        </p>
        <div className="flex no-print" style={{ gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, color: '#555' }}>
            单据：
            <select className="select" value={docType} onChange={e => setDocType(e.target.value as 'sale' | 'swap')} style={{ marginLeft: 6 }}>
              <option value="sale">车位销售单</option>
              <option value="swap">车位变更申请单</option>
            </select>
          </label>
        </div>
        {docType === 'sale' && (
          <DocEditor
            type="sale"
            initialHtml={templates.find(t => t.type === 'sale' && t.name === DOC_TITLES.sale)?.content}
            templateId={templates.find(t => t.type === 'sale' && t.name === DOC_TITLES.sale)?.id}
            sampleData={sampleData}
          />
        )}
        {docType === 'swap' && (
          <DocEditor
            type="swap"
            initialHtml={templates.find(t => t.name === DOC_TITLES.swap)?.content}
            templateId={templates.find(t => t.name === DOC_TITLES.swap)?.id}
            sampleData={sampleData}
          />
        )}
      </div>

      <div className="flex mb-4" style={{ gap: 8, alignItems: 'center' }}>
        <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => { setEditing(null); setShowEditor(true) }}>
          ➕ 新建打印模板
        </button>
      </div>

      {msg && <div className={msg.type === 'ok' ? 'text-green' : 'text-red'} style={{ marginBottom: 12, fontWeight: 500 }}>{msg.text}</div>}

      {showEditor && (
        <TemplateEditor
          initial={editing}
          onClose={() => { setShowEditor(false); setEditing(null) }}
          onMsg={setMsg}
        />
      )}

      {/* 模板列表 */}
      <section className="card mb-4" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>模板名称</th><th>类型</th><th>操作</th></tr></thead>
            <tbody>
              {templates.length === 0 && (
                <tr><td colSpan={3} className="text-center text-gray">暂无模板，点击上方新建</td></tr>
              )}
              {templates.map(t => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{TYPES.find(x => x.code === t.type)?.label || t.type}</td>
                  <td className="flex" style={{ gap: 6 }}>
                    <button className="btn-warning" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => { setPreviewTpl(t); setShowEditor(false); setEditing(null) }}>预览打印</button>
                    <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => { setEditing(t); setShowEditor(true) }}>编辑</button>
                    <button className="btn-danger" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => {
                        if (!confirm('确认删除该模板？')) return
                        startTransition(async () => {
                          try { await deletePrintTemplate(t.id); setMsg({ type: 'ok', text: '已删除' }); setTimeout(() => location.reload(), 600) }
                          catch (e: any) { setMsg({ type: 'err', text: e.message }) }
                        })
                      }}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {previewTpl && (
        <PreviewModal template={previewTpl} data={sampleData} onClose={() => setPreviewTpl(null)} />
      )}
    </div>
  )
}

function TemplateEditor({ initial, onClose, onMsg }: { initial: any | null; onClose: () => void; onMsg: (m: any) => void }) {
  const isEdit = !!initial
  const [name, setName] = useState(initial?.name || '')
  const [type, setType] = useState(initial?.type || 'query')
  const [content, setContent] = useState(initial?.content || '<div style="font-family:宋体">\n  <h2 style="text-align:center">车位查询表单</h2>\n  <table border="1" cellspacing="0" cellpadding="6" style="width:100%">\n    <tr><th>车位号</th><th>区域</th><th>楼栋</th><th>类型</th><th>状态</th><th>业主</th><th>电话</th></tr>\n    {{#each rows}}\n    <tr><td>{{space_id}}</td><td>{{garage_zone}}</td><td>{{building_no}}</td><td>{{space_type}}</td><td>{{status}}</td><td>{{owner_name}}</td><td>{{phone}}</td></tr>\n    {{/each}}\n  </table>\n</div>')
  const [pending, startTransition] = useTransition()

  // 上传文件：读取文本作为模板内容（DOC/Excel 用浏览器读取文本）
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      setContent(text)
      if (!name) setName(file.name.replace(/\.[^.]+$/, ''))
    }
    // DOCX/XLSX 为二进制，纯文本读取可能乱码；这里仍尝试，用户可在文本框修正
    reader.readAsText(file)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return onMsg({ type: 'err', text: '请填写模板名称' })
    startTransition(async () => {
      try {
        await savePrintTemplate({ id: initial?.id, name, type, content })
        onMsg({ type: 'ok', text: `✅ 模板${isEdit ? '已更新' : '已保存'}` })
        onClose()
        setTimeout(() => location.reload(), 600)
      } catch (e: any) {
        onMsg({ type: 'err', text: `❌ ${e.message}` })
      }
    })
  }

  return (
    <form onSubmit={submit} className="card mb-4" style={{ background: '#fafcff' }}>
      <div className="text-sm" style={{ fontWeight: 600, marginBottom: 8 }}>{isEdit ? '编辑模板' : '新建模板'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label className="text-sm">模板名称 *<input className="input mt-1" value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="text-sm">类型
          <select className="select mt-1" value={type} onChange={e => setType(e.target.value)}>
            {TYPES.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
          </select>
        </label>
      </div>
      <label className="text-sm mt-3" style={{ display: 'block' }}>
        上传 DOC / Excel / HTML / TXT 作为模板基础：
        <input type="file" accept=".doc,.docx,.xls,.xlsx,.html,.txt" onChange={handleFile} className="mt-1" />
      </label>
      <label className="text-sm mt-3" style={{ display: 'block' }}>
        模板内容（HTML，使用 {'{{字段}}'} 或 {'{{#each rows}}'} 循环）：
        <textarea className="input mt-1" value={content} onChange={e => setContent(e.target.value)} rows={14} style={{ fontFamily: 'monospace', fontSize: 12, width: '100%' }} />
      </label>
      <p className="text-xs text-gray mt-1">{FIELD_HINT}</p>
      <div className="flex mt-3" style={{ gap: 8 }}>
        <button type="submit" className="btn-success" disabled={pending} style={{ fontSize: 13 }}>{pending ? '保存中...' : '保存模板'}</button>
        <button type="button" className="btn-ghost" style={{ fontSize: 13 }} onClick={onClose}>取消</button>
      </div>
    </form>
  )
}

// 简易模板渲染：替换 {{字段}} 与 {{#each rows}}...{{/each}}
function renderTemplate(tpl: string, rows: any[]): string {
  let html = tpl
  // each 循环
  const eachRe = /\{\{#each rows\}\}([\s\S]*?)\{\{\/each\}\}/g
  html = html.replace(eachRe, (_m, body: string) => {
    return rows.map(r => {
      let row = body
      for (const k of Object.keys(r || {})) {
        row = row.split(`{{${k}}}`).join(r[k] ?? '')
      }
      return row
    }).join('')
  })
  // 单行字段（取第一行数据）
  const first = rows[0] || {}
  for (const k of Object.keys(first)) {
    html = html.split(`{{${k}}}`).join(first[k] ?? '')
  }
  return html
}

function PreviewModal({ template, data, onClose }: { template: any; data: any[]; onClose: () => void }) {
  const html = renderTemplate(template.content, data)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 24, overflow: 'auto' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 800, borderRadius: 8, padding: 20 }}>
        <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16 }}>打印预览：{template.name}</h3>
          <div className="flex" style={{ gap: 8 }}>
            <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => window.print()}>🖨️ 打印</button>
            <button className="btn-ghost" style={{ fontSize: 13 }} onClick={onClose}>关闭</button>
          </div>
        </div>
        <div id="print-area" style={{ border: '1px solid #eee', padding: 16 }} dangerouslySetInnerHTML={{ __html: html }} />
        {data.length === 0 && <p className="text-gray text-sm mt-2">（暂无示例数据，仅显示模板结构）</p>}
      </div>
    </div>
  )
}
