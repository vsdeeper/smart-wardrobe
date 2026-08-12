const { resolveImageUrls } = require('./doubao-vision')
const {
  matchModelTemplate,
  resolveModelTemplateFileId,
} = require('./model-template-match')
const {
  resolveActiveTryOnModelFileId,
} = require('./resolve-active-tryon-model')

async function resolveModelTemplateUrl(cloud, db, openid, gender) {
  const activeFileId = await resolveActiveTryOnModelFileId(db, openid, gender)
  if (activeFileId) {
    try {
      const [modelUrl] = await resolveImageUrls(cloud, [activeFileId])
      if (modelUrl) return modelUrl
    } catch {
      // 启用模特解析失败时回退预设 hash 选模
    }
  }

  const { templateId } = matchModelTemplate({ gender, openid })
  const resolved = resolveModelTemplateFileId(templateId)
  if (!resolved) return null

  try {
    const [modelUrl] = await resolveImageUrls(cloud, [resolved.fileId])
    return modelUrl || null
  } catch {
    return null
  }
}

module.exports = { resolveModelTemplateUrl }
