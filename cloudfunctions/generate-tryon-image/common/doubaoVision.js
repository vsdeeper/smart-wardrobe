const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
const DEFAULT_SIZE = '2K'
const MAX_REFERENCE_IMAGES = 10

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

function getSeedreamConfig() {
  const apiKey = process.env.DOUBAO_API_KEY
  const baseUrl = process.env.DOUBAO_API_BASE_URL || DEFAULT_BASE_URL
  const model = process.env.DOUBAO_SEEDREAM_MODEL
  const size = process.env.DOUBAO_SEEDREAM_SIZE || DEFAULT_SIZE
  return { apiKey, baseUrl, model, size }
}

function parseSeedreamResponse(data) {
  const item = data?.data?.[0]
  if (!item) {
    throw new Error('Seedream 未返回图片')
  }
  if (item.url) {
    return { url: item.url, b64: null }
  }
  if (item.b64_json) {
    return { url: null, b64: item.b64_json }
  }
  throw new Error('Seedream 响应缺少 url 或 b64_json')
}

async function generateSeedreamImage({ prompt, imageUrls = [] }) {
  const { apiKey, baseUrl, model, size } = getSeedreamConfig()
  if (!apiKey) throw new Error('未配置 DOUBAO_API_KEY')
  if (!model) throw new Error('未配置 DOUBAO_SEEDREAM_MODEL')

  const refs = imageUrls.filter(Boolean).slice(0, MAX_REFERENCE_IMAGES)
  const body = {
    model,
    prompt,
    sequential_image_generation: 'disabled',
    response_format: 'url',
    size,
    stream: false,
    watermark: false,
  }

  if (refs.length === 1) {
    body.image = refs[0]
  } else if (refs.length > 1) {
    body.image = refs
  }

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  if (!response.ok) {
    const errMsg = data?.error?.message || data?.message || `HTTP ${response.status}`
    throw new Error(errMsg)
  }

  return parseSeedreamResponse(data)
}

module.exports = {
  DEFAULT_BASE_URL,
  resolveImageUrl,
  resolveImageUrls,
  getSeedreamConfig,
  generateSeedreamImage,
}
