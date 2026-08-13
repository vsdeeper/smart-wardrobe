const {
  buildSystemPrompt,
  USER_PROMPT,
  parseRecognitionContent,
} = require('../constants/recognition-rules')
const { chatCompletions } = require('./model-env')

/**
 * 从衣物原图 URL 识别单品列表。
 * @param {string} imageUrl 临时 HTTPS 图片地址
 */
async function recognizeItemsFromImage(imageUrl) {
  let data
  try {
    data = await chatCompletions({
      temperature: 0.1,
      responseFormat: { type: 'json_object' },
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
    })
  } catch (err) {
    if (err?.code === 'LLM_API_ERROR') {
      throw err
    }
    const e = err instanceof Error ? err : new Error(String(err))
    e.code = 'LLM_API_ERROR'
    throw e
  }

  const content = data?.choices?.[0]?.message?.content ?? ''
  return parseRecognitionContent(content)
}

module.exports = {
  recognizeItemsFromImage,
}
