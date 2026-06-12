const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'

async function resolveImageUrl(cloud, fileID) {
  const res = await cloud.getTempFileURL({ fileList: [fileID] })
  const file = res.fileList?.[0]
  if (!file || file.status !== 0) {
    throw new Error('无法获取图片临时链接')
  }
  return file.tempFileURL
}

async function resolveImageUrls(cloud, fileIDs) {
  const unique = [...new Set(fileIDs.filter(Boolean))]
  if (unique.length === 0) return []
  const res = await cloud.getTempFileURL({ fileList: unique })
  const map = new Map()
  for (const file of res.fileList || []) {
    if (file.status === 0 && file.fileID) {
      map.set(file.fileID, file.tempFileURL)
    }
  }
  return unique.map((id) => map.get(id)).filter(Boolean)
}

function getVisionConfig() {
  const apiKey = process.env.DOUBAO_API_KEY
  const baseUrl = process.env.DOUBAO_API_BASE_URL || DEFAULT_BASE_URL
  const model = process.env.DOUBAO_VISION_MODEL
  return { apiKey, baseUrl, model }
}

async function chatCompletions({ messages, temperature = 0.3 }) {
  const { apiKey, baseUrl, model } = getVisionConfig()
  if (!apiKey) throw new Error('未配置 DOUBAO_API_KEY')
  if (!model) throw new Error('未配置 DOUBAO_VISION_MODEL')

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, temperature, messages }),
  })

  const data = await response.json()
  if (!response.ok) {
    const errMsg = data?.error?.message || data?.message || `HTTP ${response.status}`
    throw new Error(errMsg)
  }

  return data?.choices?.[0]?.message?.content ?? ''
}

module.exports = {
  DEFAULT_BASE_URL,
  resolveImageUrl,
  resolveImageUrls,
  getVisionConfig,
  chatCompletions,
}
