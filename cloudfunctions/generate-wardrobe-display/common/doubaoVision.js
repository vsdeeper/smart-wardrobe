const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
// Hero 区域有效比例 335×480；1600x2304 为 Seedream 5.0 像素下限内最小近似尺寸
const DEFAULT_HERO_SIZE = '1600x2304'
// 衣橱单品卡片 1:1；1920x1920 = 3686400 像素，为 Seedream 5.0 像素下限（1024x1024 会报错）
const DEFAULT_ITEM_DISPLAY_SIZE = '1920x1920'
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
  const size = process.env.DOUBAO_SEEDREAM_SIZE || DEFAULT_HERO_SIZE
  return { apiKey, baseUrl, model, size }
}

function getItemDisplaySize() {
  return process.env.DOUBAO_ITEM_DISPLAY_SIZE || DEFAULT_ITEM_DISPLAY_SIZE
}

function parseSeedreamImageItem(item) {
  if (!item) return null
  if (item.url) {
    return { url: item.url, b64: null }
  }
  if (item.b64_json) {
    return { url: null, b64: item.b64_json }
  }
  return null
}

function parseSeedreamResponse(data) {
  const item = parseSeedreamImageItem(data?.data?.[0])
  if (!item) {
    throw new Error('Seedream 未返回图片')
  }
  return item
}

function parseSeedreamImagesResponse(data) {
  const list = data?.data
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('Seedream 未返回图片')
  }
  const images = list.map(parseSeedreamImageItem).filter(Boolean)
  if (images.length === 0) {
    throw new Error('Seedream 响应缺少 url 或 b64_json')
  }
  return { images }
}

async function generateSeedreamImages({
  prompt,
  imageUrls = [],
  maxImages = 1,
  size,
}) {
  const { apiKey, baseUrl, model } = getSeedreamConfig()
  if (!apiKey) throw new Error('未配置 DOUBAO_API_KEY')
  if (!model) throw new Error('未配置 DOUBAO_SEEDREAM_MODEL')

  const count = Math.max(1, Math.min(15, parseInt(String(maxImages), 10) || 1))
  const outputSize = size || getSeedreamConfig().size
  const refs = imageUrls.filter(Boolean).slice(0, MAX_REFERENCE_IMAGES)

  const body = {
    model,
    prompt,
    response_format: 'url',
    size: outputSize,
    stream: false,
    watermark: false,
  }

  if (count === 1) {
    body.sequential_image_generation = 'disabled'
  } else {
    body.sequential_image_generation = 'auto'
    body.sequential_image_generation_options = { max_images: count }
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

  if (count === 1) {
    return { images: [parseSeedreamResponse(data)] }
  }
  return parseSeedreamImagesResponse(data)
}

async function generateSeedreamImage({ prompt, imageUrls = [] }) {
  const { images } = await generateSeedreamImages({
    prompt,
    imageUrls,
    maxImages: 1,
    size: getSeedreamConfig().size,
  })
  return images[0]
}

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_HERO_SIZE,
  DEFAULT_ITEM_DISPLAY_SIZE,
  resolveImageUrl,
  resolveImageUrls,
  getSeedreamConfig,
  getItemDisplaySize,
  generateSeedreamImage,
  generateSeedreamImages,
}
