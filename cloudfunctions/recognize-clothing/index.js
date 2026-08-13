const cloud = require('wx-server-sdk')
const { filterItemsByUserGender } = require('./constants/recognition-rules')
const { resolveImageUrl } = require('./utils/resolve-cloud-image')
const { recognizeItemsFromImage } = require('./utils/seed-recognize')
const {
  getModelApiKey,
  requireModelBaseUrl,
  getChatModel,
} = require('./utils/model-env')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { fileID, userGender } = event || {}

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
      getChatModel()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { error: 'PROVIDER_CONFIG', message: `${message} 环境变量` }
    }

    const imageUrl = await resolveImageUrl(cloud, fileID)
    const rawItems = await recognizeItemsFromImage(imageUrl)
    const { items, filteredCount } = filterItemsByUserGender(rawItems, userGender)

    if (items.length === 0) {
      return {
        error: 'RECOGNIZE_FAILED',
        message:
          filteredCount > 0
            ? '未识别到符合您性别的衣物'
            : '未识别到衣物单品',
      }
    }

    return {
      items,
      sourceFileId: fileID,
      filteredCount,
    }
  } catch (err) {
    if (err && err.code === 'LLM_API_ERROR') {
      return { error: 'LLM_API_ERROR', message: err.message, model: err.model }
    }
    const message = err instanceof Error ? err.message : String(err)
    return { error: 'RECOGNIZE_FAILED', message }
  }
}
