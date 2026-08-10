const cloud = require('wx-server-sdk')
const { validateMessages } = require('./utils/validate-messages')
const { resolveProvider } = require('./utils/resolve-provider')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

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
