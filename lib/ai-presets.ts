// ============ AI 服务商预设（前后端共用，不含任何密钥） ============
// 单独成文件，方便客户端组件安全引入（不会把 AI 调用逻辑打进前端包）。

export type AiPreset = {
  label: string
  baseUrl: string
  model: string
  keyHint: string
  keyUrl: string
}

/** 均提供免费额度或 OpenAI 兼容端点，切换只需改配置 */
export const AI_PRESETS: Record<string, AiPreset> = {
  groq: {
    label: 'Groq（免费额度，速度快）',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    keyHint: '以 gsk_ 开头',
    keyUrl: 'https://console.groq.com/keys',
  },
  gemini: {
    label: 'Google Gemini（免费额度）',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
    keyHint: 'Google AI Studio 的 API Key',
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  siliconflow: {
    label: '硅基流动（部分模型免费）',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    keyHint: '以 sk- 开头',
    keyUrl: 'https://cloud.siliconflow.cn/account/ak',
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    keyHint: '以 sk- 开头',
    keyUrl: 'https://platform.deepseek.com/api_keys',
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyHint: '以 sk- 开头',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  custom: {
    label: '自定义（OpenAI 兼容端点）',
    baseUrl: '',
    model: '',
    keyHint: '需同时填写 Base URL 与模型名',
    keyUrl: '',
  },
}

export const AI_PROVIDER_KEYS = Object.keys(AI_PRESETS)

export function presetOf(provider: string): AiPreset | undefined {
  return AI_PRESETS[(provider || '').toLowerCase()]
}
