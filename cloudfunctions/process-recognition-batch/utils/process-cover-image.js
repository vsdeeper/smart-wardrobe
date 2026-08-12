const { resolveImageUrl } = require('./utils/doubao-vision')
const { recognizeItemsFromImage } = require('./utils/seed-recognize')
const { filterItemsByUserGender } = require('./constants/recognition-rules')
const { generateDisplayPreviewsForBatch } = require('./utils/wardrobe-display-pipeline')

/** 识别流程错误：携带是否已成功识图，供积分按成功阶段结算 */
class RecognitionProcessError extends Error {
  constructor(message, { recognized = false, displayCount = 0 } = {}) {
    super(message)
    this.name = 'RecognitionProcessError'
    this.recognized = recognized
    this.displayCount = displayCount
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
  const rawItems = await recognizeItemsFromImage(
    imageUrl,
    apiKey,
    baseUrl,
    seedModel,
  )
  const { items, filteredCount } = filterItemsByUserGender(rawItems, userGender)

  if (items.length === 0) {
    throw new RecognitionProcessError(
      filteredCount > 0
        ? '未识别到符合您性别的衣物'
        : '未识别到衣物单品',
      { recognized: false, displayCount: 0 },
    )
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

  return previews
}

module.exports = { processCoverImage, RecognitionProcessError }
