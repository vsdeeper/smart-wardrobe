const { chatCompletions } = require('./model-env')

/**
 * 调用 Seed 文本模型生成搭评。
 */
async function callSeedChat(systemPrompt, userPrompt) {
  try {
    const data = await chatCompletions({
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })
    return data?.choices?.[0]?.message?.content ?? ''
  } catch (err) {
    if (err?.code === 'LLM_API_ERROR') {
      throw err
    }
    const e = err instanceof Error ? err : new Error(String(err))
    e.code = 'LLM_API_ERROR'
    throw e
  }
}

module.exports = { callSeedChat }
