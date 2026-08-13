const { VISION_SIZE } = require('./constants')

const MAX_REFERENCE_IMAGES = 10

function parseImageItem(item) {
  if (!item) return null
  if (item.url) {
    return { url: item.url, b64: null }
  }
  if (item.b64_json) {
    return { url: null, b64: item.b64_json }
  }
  return null
}

function parseSingleImageResponse(data) {
  const item = parseImageItem(data?.data?.[0])
  if (!item) {
    throw new Error('Seedream 未返回图片')
  }
  return item
}

function parseMultiImageResponse(data) {
  const list = data?.data
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('Seedream 未返回图片')
  }
  const images = list.map(parseImageItem).filter(Boolean)
  if (images.length === 0) {
    throw new Error('Seedream 响应缺少 url 或 b64_json')
  }
  return { images }
}

/**
 * 调用 Seedream images/generations（方舟 OpenAI 兼容）。
 * @param {object} options
 * @param {string} options.apiKey
 * @param {string} options.baseUrl
 * @param {string} options.model
 * @param {string} options.prompt
 * @param {string[]} [options.imageUrls]
 * @param {number} [options.maxImages]
 * @param {string} [options.size]
 * @returns {Promise<{ images: Array<{ url: string|null, b64: string|null }> }>}
 */
async function generateImages({
  apiKey,
  baseUrl,
  model,
  prompt,
  imageUrls = [],
  maxImages = 1,
  size,
}) {
  const count = Math.max(1, Math.min(15, parseInt(String(maxImages), 10) || 1))
  const outputSize = size || VISION_SIZE
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
    const errMsg =
      data?.error?.message || data?.message || `HTTP ${response.status}`
    throw new Error(errMsg)
  }

  if (count === 1) {
    return { images: [parseSingleImageResponse(data)] }
  }
  return parseMultiImageResponse(data)
}

/**
 * 生成单张图片。
 */
async function generateImage(options) {
  const { images } = await generateImages({ ...options, maxImages: 1 })
  return images[0]
}

module.exports = {
  generateImages,
  generateImage,
  VISION_SIZE,
}
