/**
 * 火山方舟 OpenAI 兼容 chat/completions。
 * 凭证由调用方传入，不读环境变量。
 */

/**
 * 调用 chat/completions。
 * @param {object} options
 * @param {string} options.apiKey
 * @param {string} options.baseUrl
 * @param {string} options.model
 * @param {number} options.temperature
 * @param {Array} options.messages
 * @param {{ type: string }|undefined} [options.responseFormat]
 * @returns {Promise<object>} API 响应 JSON
 */
async function chatCompletions({
  apiKey,
  baseUrl,
  model,
  temperature,
  messages,
  responseFormat,
}) {
  const body = {
    model,
    temperature,
    messages,
  }
  if (responseFormat) {
    body.response_format = responseFormat
  }

  let response
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
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

  return data
}

module.exports = { chatCompletions }
