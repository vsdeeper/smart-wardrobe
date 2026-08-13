const cloud = require('wx-server-sdk')
const { DISPLAY_IMAGE_MAX_COUNT } = require('./constants/item-display-rules')
const { runWardrobeDisplayPipeline } = require('./utils/wardrobe-display-pipeline')
const { normalizeItemsInput } = require('./utils/normalize-items')
const {
  getModelApiKey,
  requireModelBaseUrl,
  getImageModel,
} = require('./utils/model-env')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { fileID, items: rawItems } = event || {}

  if (!fileID || typeof fileID !== 'string') {
    return { error: 'INVALID_FILE_ID', message: '缺少 fileID' }
  }

  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    if (!openid) {
      return { error: 'NO_OPENID', message: '无法获取用户身份' }
    }

    try {
      getModelApiKey()
      requireModelBaseUrl()
      getImageModel()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { error: 'PROVIDER_CONFIG', message: `${message} 环境变量` }
    }

    const items = normalizeItemsInput(rawItems)

    if (items.length > DISPLAY_IMAGE_MAX_COUNT) {
      console.warn(
        `[generate-wardrobe-display] 临时仅生成前 ${DISPLAY_IMAGE_MAX_COUNT} 件展示图，已跳过 ${items.length - DISPLAY_IMAGE_MAX_COUNT} 件`,
      )
    }

    let pipelineResult
    try {
      pipelineResult = await runWardrobeDisplayPipeline(cloud, {
        fileID,
        items,
        openid,
        options: { deleteSource: true },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { error: 'SEEDREAM_FAILED', message }
    }

    const { previews, failed } = pipelineResult

    if (previews.length === 0) {
      return { error: 'GENERATE_FAILED', message: '未能生成任何单品展示图', failed }
    }

    const response = { previews }
    if (failed.length > 0) {
      response.failed = failed
    }
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: 'GENERATE_FAILED', message }
  }
}
