const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const PROVIDERS = {
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_API_BASE_URL,
    model: process.env.DEEPSEEK_MODEL,
  },
  doubao: {
    apiKey: process.env.DOUBAO_API_KEY,
    baseUrl: process.env.DOUBAO_API_BASE_URL,
    model: process.env.DOUBAO_MODEL,
  },
}

function resolveProvider(name) {
  const provider = name || process.env.LLM_DEFAULT_PROVIDER || 'deepseek'
  const config = PROVIDERS[provider]
  if (!config) {
    return { error: `不支持的 provider: ${provider}，可选 deepseek | doubao` }
  }
  if (!config.apiKey) {
    return {
      error: `未配置 ${provider === 'deepseek' ? 'DEEPSEEK' : 'DOUBAO'}_API_KEY 环境变量`,
      provider,
    }
  }
  if (provider === 'doubao' && !config.model) {
    return { error: '未配置 DOUBAO_MODEL 环境变量（方舟模型 ID）', provider }
  }
  return { provider, config }
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'messages 必须为非空数组'
  }
  for (const msg of messages) {
    if (!msg || typeof msg.role !== 'string' || typeof msg.content !== 'string') {
      return 'messages 每项须包含 role、content 字符串字段'
    }
  }
  return null
}

exports.main = async (event) => {
  const { provider: providerName, messages, model: modelOverride } = event || {}

  const messageError = validateMessages(messages)
  if (messageError) {
    return { error: 'INVALID_MESSAGES', message: messageError }
  }

  const resolved = resolveProvider(providerName)
  if (resolved.error) {
    return { error: 'PROVIDER_CONFIG', message: resolved.error, provider: resolved.provider }
  }

  const { provider, config } = resolved
  const model = modelOverride || config.model

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        ...(provider === 'deepseek' ? { thinking: { type: 'disabled' } } : {}),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const errMsg =
        data?.error?.message || data?.message || `HTTP ${response.status}`
      return { error: 'LLM_API_ERROR', message: errMsg, provider, model }
    }

    const content = data?.choices?.[0]?.message?.content ?? ''
    return {
      provider,
      model,
      content,
      usage: data?.usage ?? null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: 'REQUEST_FAILED', message, provider, model }
  }
}
