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
  if (!apiKey) throw new Error('未配置 DOUBAO_API_KEY')
  if (!model) throw new Error('未配置 DOUBAO_SEED_MODEL')

  const res = await fetch(`${baseUrl}/chat/completions`, {
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
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || `HTTP ${res.status}`)
  }
  return data?.choices?.[0]?.message?.content ?? ''
}

module.exports = { callSeedChat, resolveSeedTemperature }
