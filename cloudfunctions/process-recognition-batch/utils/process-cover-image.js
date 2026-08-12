const { resolveImageUrl } = require('./doubao-vision')
const { recognizeItemsFromImage } = require('./seed-recognize')
const { filterItemsByUserGender } = require('../constants/recognition-rules')
const { generateDisplayPreviewsForBatch } = require('./wardrobe-display-pipeline')

/** 识别流程错误：携带是否已成功识图与结构化错误码，供积分结算与前端友好提示 */
class RecognitionProcessError extends Error {
  constructor(
    message,
    { recognized = false, displayCount = 0, errorCode, chargeBase = false } = {},
  ) {
    super(message)
    this.name = 'RecognitionProcessError'
    this.recognized = recognized
    this.displayCount = displayCount
    this.errorCode = errorCode
    // API 调用已完成（收到 200 响应）→ 应收基础费；仅第三方 API 报错才整单免费
    this.chargeBase = chargeBase
  }
}

async function processCoverImage(
  cloud,
  fileID,
  userGender,
  apiKey,
  baseUrl,
  seedModel,
  openid,
  onPhase,
) {
  const imageUrl = await resolveImageUrl(cloud, fileID)

  let rawItems
  try {
    rawItems = await recognizeItemsFromImage(
      imageUrl,
      apiKey,
      baseUrl,
      seedModel,
    )
  } catch (err) {
    // 第三方 API 报错（HTTP/网络/传输层）：识别调用未完成，整单免费
    if (err?.code === 'LLM_API_ERROR') {
      throw err
    }
    // 其余（响应已返回但空识别 / 不可解析）：识别调用已完成 → 收基础费，转友好阻断
    throw new RecognitionProcessError('未识别到衣物，请换张图片试试', {
      recognized: false,
      displayCount: 0,
      errorCode: 'NOTHING_RECOGNIZED',
      chargeBase: true,
    })
  }

  const { items, filteredCount } = filterItemsByUserGender(rawItems, userGender)

  if (items.length === 0) {
    // 识别 API 已完成但单品全部与性别不符 → 阻断并收基础费
    throw new RecognitionProcessError('衣物与您的性别不符，请更换图片', {
      recognized: false,
      displayCount: 0,
      errorCode: 'GENDER_MISMATCH',
      chargeBase: true,
    })
  }

  if (typeof onPhase === 'function') {
    await onPhase('generating')
  }

  let previews
  try {
    previews = await generateDisplayPreviewsForBatch(
      cloud,
      items,
      imageUrl,
      openid,
    )
  } catch (err) {
    // Seedream 展示图 API 失败：成果费免收；识图 API 已完成 → 仍收基础费
    console.warn(
      '[process-cover-image] 展示图生成失败:',
      err instanceof Error ? err.message : String(err),
    )
    throw new RecognitionProcessError('未能生成展示图', {
      recognized: true,
      displayCount: 0,
      chargeBase: true,
    })
  }
  if (previews.length === 0) {
    throw new RecognitionProcessError('未能生成展示图', {
      recognized: true,
      displayCount: 0,
      chargeBase: true,
    })
  }

  return { previews, filteredCount }
}

module.exports = { processCoverImage, RecognitionProcessError }
