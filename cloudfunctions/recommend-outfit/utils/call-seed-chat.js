const { DEFAULT_TEMPERATURE } = require('../constants/seed-temperature')
const { requireEnv } = require('./utils/env')

function resolveSeedTemperature() {
  const raw = process.env.DOUBAO_SEED_TEMPERATURE
  const parsed =
    raw === undefined || raw === '' ? DEFAULT_TEMPERATURE : parseFloat(raw)
  if (Number.isNaN(parsed)) return DEFAULT_TEMPERATURE
  return Math.min(2, Math.max(0, parsed))
}

async function callSeedChat(systemPrompt, userPrompt) {
  const apiKey = process.env.DOUBAO_API_KEY
  const baseUrl = requireEnv('DOUBAO_API_BASE_URL')
  const model = process.env.DOUBAO_SEED_MODEL
  if (!apiKey) {
    const e = new Error('未配置 DOUBAO_API_KEY')
    e.code = 'LLM_API_ERROR'
    throw e
  }
  if (!model) {
    const e = new Error('未配置 DOUBAO_SEED_MODEL')
    e.code = 'LLM_API_ERROR'
    throw e
  }

  let res
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: resolveSeedTemperature(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })
  } catch (err) {
    // 网络/超时等传输层失败：API 未完成，标记供调用方免收基础费
    const e = err instanceof Error ? err : new Error(String(err))
    e.code = 'LLM_API_ERROR'
    throw e
  }

  const data = await res.json()
  if (!res.ok) {
    const e = new Error(
      data?.error?.message || data?.message || `HTTP ${res.status}`,
    )
    e.code = 'LLM_API_ERROR'
    throw e
  }
  return data?.choices?.[0]?.message?.content ?? ''
}

module.exports = { callSeedChat, resolveSeedTemperature }
