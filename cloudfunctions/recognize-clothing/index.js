const cloud = require('wx-server-sdk')
const {
  buildSystemPrompt,
  USER_PROMPT,
  parseRecognitionItems,
} = require('./common/recognitionRules')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
const DEFAULT_TEMPERATURE = 0.1

async function resolveImageUrl(fileID) {
  const res = await cloud.getTempFileURL({ fileList: [fileID] })
  const file = res.fileList?.[0]
  if (!file || file.status !== 0) {
    throw new Error('无法获取图片临时链接')
  }
  return file.tempFileURL
}

function resolveVisionTemperature() {
  const raw = process.env.DOUBAO_SEED_TEMPERATURE
  const parsed = raw === undefined || raw === '' ? DEFAULT_TEMPERATURE : parseFloat(raw)
  if (Number.isNaN(parsed)) return DEFAULT_TEMPERATURE
  return Math.min(2, Math.max(0, parsed))
}

function parseRecognitionContent(content) {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI 返回格式无效')
  }
  const parsed = JSON.parse(jsonMatch[0])
  return parseRecognitionItems(parsed)
}

async function recognizeItemsFromImage(imageUrl, apiKey, baseUrl, model) {
  const temperature = resolveVisionTemperature()
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
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

  const data = await response.json()
  if (!response.ok) {
    const errMsg = data?.error?.message || data?.message || `HTTP ${response.status}`
    const err = new Error(errMsg)
    err.code = 'LLM_API_ERROR'
    err.model = model
    throw err
  }

  const content = data?.choices?.[0]?.message?.content ?? ''
  return parseRecognitionContent(content)
}

exports.main = async (event) => {
  const { fileID } = event || {}

  if (!fileID || typeof fileID !== 'string') {
    return { error: 'INVALID_FILE_ID', message: '缺少 fileID' }
  }

  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    if (!openid) {
      return { error: 'NO_OPENID', message: '无法获取用户身份' }
    }

    const apiKey = process.env.DOUBAO_API_KEY
    const baseUrl = process.env.DOUBAO_API_BASE_URL || DEFAULT_BASE_URL
    const seedModel = process.env.DOUBAO_SEED_MODEL

    if (!apiKey) {
      return { error: 'PROVIDER_CONFIG', message: '未配置 DOUBAO_API_KEY 环境变量' }
    }
    if (!seedModel) {
      return { error: 'PROVIDER_CONFIG', message: '未配置 DOUBAO_SEED_MODEL 环境变量' }
    }

    const imageUrl = await resolveImageUrl(fileID)
    const items = await recognizeItemsFromImage(imageUrl, apiKey, baseUrl, seedModel)

    return {
      items,
      sourceFileId: fileID,
    }
  } catch (err) {
    if (err && err.code === 'LLM_API_ERROR') {
      return { error: 'LLM_API_ERROR', message: err.message, model: err.model }
    }
    const message = err instanceof Error ? err.message : String(err)
    return { error: 'RECOGNIZE_FAILED', message }
  }
}
