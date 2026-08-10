const { resolveImageUrls } = require('./doubao-vision')
const {
  matchModelTemplate,
  resolveModelTemplateFileId,
} = require('./model-template-match')

async function resolveModelTemplateUrl(cloud, openid, gender) {
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
