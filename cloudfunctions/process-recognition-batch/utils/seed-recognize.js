const {
  buildSystemPrompt,
  USER_PROMPT,
  parseRecognitionContent,
} = require('../constants/recognition-rules')

const DEFAULT_TEMPERATURE = 0.1

function resolveVisionTemperature() {
  const raw = process.env.DOUBAO_SEED_TEMPERATURE
  const parsed =
    raw === undefined || raw === '' ? DEFAULT_TEMPERATURE : parseFloat(raw)
  if (Number.isNaN(parsed)) return DEFAULT_TEMPERATURE
  return Math.min(2, Math.max(0, parsed))
}

async function recognizeItemsFromImage(imageUrl, apiKey, baseUrl, model) {
  const temperature = resolveVisionTemperature()
  let response
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: USER_PROMPT },
            ],
          },
        ],
      }),
    })
  } catch (err) {
    // 网络/超时等传输层失败：同样视为「API 报错」，调用方据此免收基础费
    const e = err instanceof Error ? err : new Error(String(err))
    e.code = 'LLM_API_ERROR'
    throw e
  }

  const data = await response.json()
  if (!response.ok) {
    const errMsg =
      data?.error?.message || data?.message || `HTTP ${response.status}`
    const err = new Error(errMsg)
    err.code = 'LLM_API_ERROR'
    err.model = model
    throw err
  }

  const content = data?.choices?.[0]?.message?.content ?? ''
  return parseRecognitionContent(content)
}

module.exports = {
  DEFAULT_TEMPERATURE,
  resolveVisionTemperature,
  recognizeItemsFromImage,
}
