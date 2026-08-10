const cloud = require('wx-server-sdk')
const { filterItemsByUserGender } = require('./constants/recognition-rules')
const { resolveImageUrl } = require('./utils/doubao-vision')
const { recognizeItemsFromImage } = require('./utils/seed-recognize')
const { requireEnv } = require('./utils/env')

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

    const apiKey = process.env.DOUBAO_API_KEY
    const baseUrl = requireEnv('DOUBAO_API_BASE_URL')
    const seedModel = process.env.DOUBAO_SEED_MODEL

    if (!apiKey) {
      return { error: 'PROVIDER_CONFIG', message: '未配置 DOUBAO_API_KEY 环境变量' }
    }
    if (!seedModel) {
      return { error: 'PROVIDER_CONFIG', message: '未配置 DOUBAO_SEED_MODEL 环境变量' }
    }

    const imageUrl = await resolveImageUrl(cloud, fileID)
    const rawItems = await recognizeItemsFromImage(imageUrl, apiKey, baseUrl, seedModel)
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
