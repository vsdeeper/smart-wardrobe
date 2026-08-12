/**
 * 异步处理衣物识别批次：对 coverFileId 原图执行识别 + 展示图生成，写回 recognition_batches。
 */
const cloud = require('wx-server-sdk')
const { COLLECTION } = require('./constants/collection')
const { updateBatch, failBatch } = require('./utils/batch-db')
const {
  processCoverImage,
  RecognitionProcessError,
} = require('./utils/process-cover-image')
const { requireEnv } = require('./utils/env')
const {
  RECOGNIZE_BASE,
  DISPLAY_IMAGE,
  RECOGNIZE_HOLD_MAX,
  ERROR_INSUFFICIENT,
} = require('./constants/credits')
const {
  hold,
  settle,
  release,
  ERROR_INSUFFICIENT: CREDITS_INSUFFICIENT,
} = require('./utils/credits')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/** 按识图/展示图成功情况计算实扣积分 */
function calcRecognizeCharge(displayCount) {
  const count = typeof displayCount === 'number' ? displayCount : 0
  return RECOGNIZE_BASE + DISPLAY_IMAGE * Math.max(0, count)
}

/** 识别失败时按错误类型结算或释放预占 */
async function finalizeRecognizeHold(openid, holdId, err) {
  if (!holdId) return

  if (err instanceof RecognitionProcessError && err.recognized) {
    await settle(db, openid, holdId, calcRecognizeCharge(err.displayCount))
    return
  }

  await release(db, openid, holdId)
}

exports.main = async (event) => {
  const { batchId, userGender } = event || {}
  let creditHoldId = null
  let openid = null

  if (!batchId || typeof batchId !== 'string') {
    return { error: 'INVALID_BATCH_ID', message: '缺少 batchId' }
  }

  try {
    const wxContext = cloud.getWXContext()
    openid = wxContext.OPENID
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
      const held = await hold(db, openid, RECOGNIZE_HOLD_MAX, 'recognize', batchId)
      creditHoldId = held.holdId
    } catch (holdErr) {
      const message =
        holdErr instanceof Error ? holdErr.message : '积分预占失败'
      if (holdErr?.error === CREDITS_INSUFFICIENT) {
        await failBatch(batchId, message)
        return { error: ERROR_INSUFFICIENT, message }
      }
      await failBatch(batchId, message)
      return { error: 'CREDITS_HOLD_FAILED', message }
    }

    try {
      await updateBatch(batchId, {
        progress: { current: 1, total: 1, phase: 'recognizing' },
      })

      const { previews, filteredCount } = await processCoverImage(
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

      await settle(
        db,
        openid,
        creditHoldId,
        calcRecognizeCharge(previews.length),
      )
      creditHoldId = null

      await updateBatch(batchId, {
        status: 'succeeded',
        progress: { current: 1, total: 1 },
        items: previews,
        itemCount: previews.length,
        genderFilteredCount: filteredCount,
        coverFileId,
      })

      return {
        batchId,
        itemCount: previews.length,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn('[process-recognition-batch] 识别失败:', message)

      try {
        await finalizeRecognizeHold(openid, creditHoldId, err)
        creditHoldId = null
      } catch (creditErr) {
        console.warn(
          '[process-recognition-batch] 积分回滚失败:',
          creditErr instanceof Error ? creditErr.message : creditErr,
        )
      }

      const failExtra = {
        progress: { current: 1, total: 1 },
        itemCount: 0,
        items: [],
        coverFileId,
      }
      if (err instanceof RecognitionProcessError && err.errorCode) {
        failExtra.errorCode = err.errorCode
      }
      await failBatch(batchId, message, failExtra)
      return {
        error: 'RECOGNIZE_FAILED',
        message,
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    if (openid && creditHoldId) {
      try {
        await release(db, openid, creditHoldId)
      } catch (releaseErr) {
        console.warn(
          '[process-recognition-batch] 外层积分释放失败:',
          releaseErr instanceof Error ? releaseErr.message : releaseErr,
        )
      }
    }

    await failBatch(batchId, message)
    return { error: 'PROCESS_FAILED', message }
  }
}
