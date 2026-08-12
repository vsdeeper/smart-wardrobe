const { resolveImageUrl } = require('./doubao-vision')
const { recognizeItemsFromImage } = require('./seed-recognize')
const { filterItemsByUserGender } = require('../constants/recognition-rules')
const { generateDisplayPreviewsForBatch } = require('./wardrobe-display-pipeline')

/** 识别流程错误：携带是否已成功识图与结构化错误码，供积分结算与前端友好提示 */
class RecognitionProcessError extends Error {
  constructor(message, { recognized = false, displayCount = 0, errorCode } = {}) {
    super(message)
    this.name = 'RecognitionProcessError'
    this.recognized = recognized
    this.displayCount = displayCount
    this.errorCode = errorCode
  }
}

/** 空识别类错误特征：AI 返回空数组 / 缺 items 数组 / 返回为空 */
const EMPTY_RECOGNITION_MARKERS = ['未识别到衣物单品', 'AI 返回为空', '缺少 items']

function isEmptyRecognitionError(message) {
  if (typeof message !== 'string') return false
  return EMPTY_RECOGNITION_MARKERS.some((marker) => message.includes(marker))
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
    // 未识别到任何衣物：转为带错误码的阻断，便于前端给出友好提示
    if (isEmptyRecognitionError(err instanceof Error ? err.message : String(err))) {
      throw new RecognitionProcessError('未识别到衣物，请换张图片试试', {
        recognized: false,
        displayCount: 0,
        errorCode: 'NOTHING_RECOGNIZED',
      })
    }
    throw err
  }

  const { items, filteredCount } = filterItemsByUserGender(rawItems, userGender)

  if (items.length === 0) {
    throw new RecognitionProcessError('衣物与您的性别不符，请更换图片', {
      recognized: false,
      displayCount: 0,
      errorCode: 'GENDER_MISMATCH',
    })
  }

  if (typeof onPhase === 'function') {
    await onPhase('generating')
  }

  const previews = await generateDisplayPreviewsForBatch(
    cloud,
    items,
    imageUrl,
    openid,
  )
  if (previews.length === 0) {
    throw new RecognitionProcessError('未能生成展示图', {
      recognized: true,
      displayCount: 0,
    })
  }

  return { previews, filteredCount }
}

module.exports = { processCoverImage, RecognitionProcessError }
