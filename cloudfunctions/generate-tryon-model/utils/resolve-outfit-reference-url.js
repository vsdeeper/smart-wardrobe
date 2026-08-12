const { resolveImageUrls } = require('./doubao-vision')
const MODEL_TEMPLATE_FILE_IDS = require('../constants/model-template-file-ids')

/**
 * 解析同性别 standard-01 预设临时链，作为着装/棚拍参考。
 */
async function resolveOutfitReferenceUrl(cloud, gender) {
  const templateId = `${gender}-standard-01`
  const fileId = MODEL_TEMPLATE_FILE_IDS[templateId]
  if (!fileId || !String(fileId).trim()) return null

  try {
    const [url] = await resolveImageUrls(cloud, [fileId])
    return url || null
  } catch {
    return null
  }
}

module.exports = { resolveOutfitReferenceUrl };
