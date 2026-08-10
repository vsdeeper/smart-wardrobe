/**
 * 异步处理衣物识别批次：对 coverFileId 原图执行识别 + 展示图生成，写回 recognition_batches。
 */
const cloud = require('wx-server-sdk')
const { COLLECTION } = require('./constants/collection')
const { updateBatch, failBatch } = require('./utils/batch-db')
const { processCoverImage } = require('./utils/process-cover-image')
const { requireEnv } = require('./utils/env')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { batchId, userGender } = event || {}

  if (!batchId || typeof batchId !== 'string') {
    return { error: 'INVALID_BATCH_ID', message: '缺少 batchId' }
  }

  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    if (!openid) {
      await failBatch(batchId, '无法获取用户身份')
      return { error: 'NO_OPENID', message: '无法获取用户身份' }
    }

    const apiKey = process.env.DOUBAO_API_KEY
    const baseUrl = requireEnv('DOUBAO_API_BASE_URL')
    const seedModel = process.env.DOUBAO_SEED_MODEL

    if (!apiKey) {
      await failBatch(batchId, '未配置 DOUBAO_API_KEY 环境变量')
      return { error: 'PROVIDER_CONFIG', message: '未配置 DOUBAO_API_KEY 环境变量' }
    }
    if (!seedModel) {
      await failBatch(batchId, '未配置 DOUBAO_SEED_MODEL 环境变量')
      return {
        error: 'PROVIDER_CONFIG',
        message: '未配置 DOUBAO_SEED_MODEL 环境变量',
      }
    }
    if (!process.env.DOUBAO_VISION_MODEL) {
      await failBatch(batchId, '未配置 DOUBAO_VISION_MODEL 环境变量')
      return {
        error: 'PROVIDER_CONFIG',
        message: '未配置 DOUBAO_VISION_MODEL 环境变量',
      }
    }

    const docRes = await db.collection(COLLECTION).doc(batchId).get()
    const batch = docRes.data
    if (!batch || !batch._id) {
      return { error: 'NOT_FOUND', message: '识别记录不存在' }
    }
    if (batch._openid && batch._openid !== openid) {
      await failBatch(batchId, '无权处理该识别记录')
      return { error: 'FORBIDDEN', message: '无权处理该识别记录' }
    }
    if (batch.status !== 'processing') {
      return {
        error: 'INVALID_STATUS',
        message: '该识别记录已处理或不在识别中',
      }
    }

    const coverFileId =
      typeof batch.coverFileId === 'string' && batch.coverFileId
        ? batch.coverFileId
        : ''
    if (!coverFileId) {
      await failBatch(batchId, '缺少原图')
      return { error: 'INVALID_SOURCES', message: '缺少原图' }
    }

    try {
      await updateBatch(batchId, {
        progress: { current: 1, total: 1, phase: 'recognizing' },
      })

      const items = await processCoverImage(
        cloud,
        coverFileId,
        userGender,
        apiKey,
        baseUrl,
        seedModel,
        openid,
        () =>
          updateBatch(batchId, {
            progress: { current: 1, total: 1, phase: 'generating' },
          }),
      )

      await updateBatch(batchId, {
        status: 'succeeded',
        progress: { current: 1, total: 1 },
        items,
        itemCount: items.length,
        coverFileId,
      })

      return {
        batchId,
        itemCount: items.length,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn('[process-recognition-batch] 识别失败:', message)
      await failBatch(batchId, message, {
        progress: { current: 1, total: 1 },
        itemCount: 0,
        items: [],
        coverFileId,
      })
      return {
        error: 'RECOGNIZE_FAILED',
        message,
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await failBatch(batchId, message)
    return { error: 'PROCESS_FAILED', message }
  }
}
