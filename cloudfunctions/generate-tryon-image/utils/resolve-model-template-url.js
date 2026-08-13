const { resolveImageUrls } = require('./resolve-cloud-image')
const {
  matchModelTemplate,
  resolveModelTemplateFileId,
} = require('./model-template-match')
const {
  resolveActiveTryOnModel,
} = require('./resolve-active-tryon-model')

/**
 * 解析试穿模特参考图 URL 及其性别。
 * @returns {Promise<{ modelUrl: string|null, modelGender: ('male'|'female'|undefined) }>}
 * 启用模特（含自定义存储性别）；无启用或解析失败时回退同性别 preset（modelGender = gender）。
 */
async function resolveModelTemplateUrl(cloud, db, openid, gender) {
  const active = await resolveActiveTryOnModel(db, openid, gender)
  if (active) {
    try {
      const [modelUrl] = await resolveImageUrls(cloud, [active.fileId])
      if (modelUrl) {
        return { modelUrl, modelGender: active.modelGender }
      }
    } catch {
      // 启用模特解析失败时回退 preset hash 选模
    }
  }

  const { templateId } = matchModelTemplate({ gender, openid })
  const resolved = resolveModelTemplateFileId(templateId)
  if (!resolved) return { modelUrl: null, modelGender: undefined }

  try {
    const [modelUrl] = await resolveImageUrls(cloud, [resolved.fileId])
    return {
      modelUrl: modelUrl || null,
      modelGender: modelUrl ? gender : undefined,
    }
  } catch {
    return { modelUrl: null, modelGender: undefined }
  }
}

module.exports = { resolveModelTemplateUrl }
