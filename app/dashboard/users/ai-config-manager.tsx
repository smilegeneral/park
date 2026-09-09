'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveAiConfig, setDefaultAiConfig, deleteAiConfig } from '@/lib/actions'
import { AI_PRESETS, AI_PROVIDER_KEYS } from '@/lib/ai-presets'
import type { AiConfig } from '@/lib/types'

// ============================================================
//  AI 配置管理（统计报表「AI 智能问数」使用）
//  - 名称 / 服务商 / API Key / 模型，可设默认与启停
//  - Key 只存密文，列表仅展示脱敏片段，明文不回前端
// ============================================================

function friendlyError(e: any): string {
  const m = String(e?.message || e)
  if (m.includes('does not exist') || m.includes('relation')) {
    return '数据库缺少 ai_config 表，请先在 SQL 编辑器执行 sql/init-ai-config.sql'
  }
  return m
}

export default function AiConfigManager({
  configs,
  loadError,
}: {
  configs: AiConfig[]
  loadError?: string
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AiConfig | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const apply = (m: { type: 'ok' | 'err'; text: string }) => {
    setMsg(m)
    router.refresh()
  }

  function handleDelete(c: AiConfig) {
    if (!confirm(`确定删除 AI 配置「${c.name}」？`)) return
    startTransition(async () => {
      try {
        const res = await deleteAiConfig({ id: c.id })
        if (res.ok) apply({ type: 'ok', text: `✅ 已删除「${c.name}」` })
        else setMsg({ type: 'err', text: `❌ ${friendlyError(res.error)}` })
      } catch (e: any) {
        setMsg({ type: 'err', text: `❌ ${friendlyError(e)}` })
      }
    })
  }

  function handleSetDefault(c: AiConfig) {
    startTransition(async () => {
      try {
        const res = await setDefaultAiConfig({ id: c.id })
        if (res.ok) apply({ type: 'ok', text: `✅ 已将「${c.name}」设为默认` })
        else setMsg({ type: 'err', text: `❌ ${friendlyError(res.error)}` })
      } catch (e: any) {
        setMsg({ type: 'err', text: `❌ ${friendlyError(e)}` })
      }
    })
  }

  return (
    <section style={{ marginTop: 32 }}>
      <div className="flex mb-4" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>🤖 AI 配置（AI 智能问数）</h2>
          <p className="text-xs text-gray">
            供「统计报表 → AI 智能问数」使用；API Key 经 AES-256 加密存储，保存后不再显示明文
          </p>
        </div>
        <button
          className="btn-primary"
          style={{ fontSize: 13, flexShrink: 0 }}
          onClick={() => { setEditing(null); setShowForm(true) }}
        >
          ➕ 新增 AI
        </button>
      </div>

      {showForm && (
        <AiConfigForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onMsg={apply}
        />
      )}

      {loadError && (
        <div
          style={{
            marginBottom: 12,
            fontSize: 13,
            background: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 6,
            padding: '8px 12px',
            color: '#cf1322',
          }}
        >
          ⚠️ 读取 ai_config 表失败：{loadError}
          <div style={{ marginTop: 4 }}>
            请先在数据库执行 <code>sql/init-ai-config.sql</code> 建表，再刷新本页。
          </div>
        </div>
      )}

      {msg && (
        <div
          className={msg.type === 'ok' ? 'text-green' : 'text-red'}
          style={{ marginBottom: 12, fontSize: 14, fontWeight: 500 }}
        >
          {msg.text}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>AI 名称</th>
                <th>服务商</th>
                <th>模型</th>
                <th>API Key</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {configs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray" style={{ padding: 24 }}>
                    暂无 AI 配置，点击右上角「新增 AI」添加（也可继续用环境变量 AI_API_KEY 兜底）
                  </td>
                </tr>
              )}
              {configs.map(c => {
                const preset = AI_PRESETS[c.provider]
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td className="text-sm">{preset?.label || c.provider}</td>
                    <td className="text-sm">
                      {c.model || <span className="text-gray">预设：{preset?.model || '—'}</span>}
                    </td>
                    <td style={{ fontFamily: 'monospace' }} className="text-sm">
                      {c.api_key_hint || '—'}
                    </td>
                    <td>
                      {c.is_default && <span className="badge badge-blue">默认</span>}{' '}
                      {c.enabled
                        ? <span className="badge badge-green">启用</span>
                        : <span className="badge badge-gray">停用</span>}
                    </td>
                    <td>
                      <div className="flex" style={{ gap: 6 }}>
                        <button
                          className="btn-warning"
                          style={{ fontSize: 12, padding: '4px 10px' }}
                          disabled={pending}
                          onClick={() => { setEditing(c); setShowForm(true) }}
                        >
                          编辑
                        </button>
                        {!c.is_default && (
                          <button
                            className="btn-secondary"
                            style={{ fontSize: 12, padding: '4px 10px' }}
                            disabled={pending}
                            onClick={() => handleSetDefault(c)}
                          >
                            设为默认
                          </button>
                        )}
                        <button
                          className="btn-danger"
                          style={{ fontSize: 12, padding: '4px 10px' }}
                          disabled={pending}
                          onClick={() => handleDelete(c)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function AiConfigForm({
  initial,
  onClose,
  onMsg,
}: {
  initial: AiConfig | null
  onClose: () => void
  onMsg: (m: { type: 'ok' | 'err'; text: string }) => void
}) {
  const isEdit = !!initial
  const [name, setName] = useState(initial?.name || '')
  const [provider, setProvider] = useState(initial?.provider || 'groq')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState(initial?.base_url || '')
  const [model, setModel] = useState(initial?.model || '')
  const [enabled, setEnabled] = useState(initial?.enabled !== false)
  const [isDefault, setIsDefault] = useState(initial?.is_default || false)
  const [pending, startTransition] = useTransition()

  const preset = AI_PRESETS[provider]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return onMsg({ type: 'err', text: '请填写 AI 名称' })
    if (!isEdit && !apiKey.trim()) return onMsg({ type: 'err', text: '请填写 API Key' })

    startTransition(async () => {
      try {
        const res = await saveAiConfig({
          id: initial?.id,
          name: name.trim(),
          provider,
          apiKey,
          baseUrl,
          model,
          enabled,
          isDefault,
        })
        if (res.ok) {
          onMsg({ type: 'ok', text: `✅ AI「${name}」已保存` })
          onClose()
        } else {
          onMsg({ type: 'err', text: `❌ ${friendlyError(res.error)}` })
        }
      } catch (e: any) {
        onMsg({ type: 'err', text: `❌ ${friendlyError(e)}` })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-4" style={{ background: '#fafcff' }}>
      <div className="text-sm" style={{ fontWeight: 600, marginBottom: 10 }}>
        {isEdit ? '编辑 AI 配置' : '新增 AI 配置'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Labeled label="AI 名称 *">
          <input
            className="input"
            value={name}
            placeholder="如：主力 Groq"
            onChange={e => setName(e.target.value)}
          />
        </Labeled>

        <Labeled label="服务商 *">
          <select
            className="select"
            value={provider}
            onChange={e => {
              // 切换服务商时清空端点/模型，避免沿用上一个服务商的预设值
              setProvider(e.target.value)
              setBaseUrl('')
              setModel('')
            }}
          >
            {AI_PROVIDER_KEYS.map(k => (
              <option key={k} value={k}>{AI_PRESETS[k].label}</option>
            ))}
          </select>
        </Labeled>

        <Labeled label={isEdit ? 'API Key（留空则不修改）' : 'API Key *'}>
          <input
            className="input"
            type="password"
            value={apiKey}
            placeholder={preset?.keyHint || 'API Key'}
            onChange={e => setApiKey(e.target.value)}
          />
        </Labeled>

        <Labeled label={`模型${preset?.model ? `（留空用预设：${preset.model}）` : ''}`}>
          <input
            className="input"
            value={model}
            placeholder={preset?.model || '模型名'}
            onChange={e => setModel(e.target.value)}
          />
        </Labeled>

        <Labeled label={`Base URL${preset?.baseUrl ? '（留空用预设）' : '（自定义服务商必填）'}`}>
          <input
            className="input"
            value={baseUrl}
            placeholder={preset?.baseUrl || 'https://.../v1'}
            onChange={e => setBaseUrl(e.target.value)}
          />
        </Labeled>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, paddingBottom: 8 }}>
          <label className="text-sm flex" style={{ gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            启用
          </label>
          <label className="text-sm flex" style={{ gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
            设为默认
          </label>
        </div>
      </div>

      {preset?.keyUrl && (
        <p className="text-xs text-gray mt-2">
          申请地址：
          <a href={preset.keyUrl} target="_blank" rel="noreferrer">{preset.keyUrl}</a>
        </p>
      )}

      <div className="flex mt-4" style={{ gap: 8 }}>
        <button type="submit" className="btn-success" disabled={pending} style={{ fontSize: 13 }}>
          {pending ? '保存中...' : '保存'}
        </button>
        <button type="button" className="btn-ghost" style={{ fontSize: 13 }} onClick={onClose}>
          取消
        </button>
      </div>
    </form>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 12, color: '#555', display: 'block' }}>
      {label}
      <div style={{ marginTop: 2 }}>{children}</div>
    </label>
  )
}
