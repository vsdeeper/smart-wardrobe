const {
  buildItemsDisplayPrompt,
  DISPLAY_IMAGE_MAX_COUNT,
  selectItemsForDisplayGeneration,
} = require('../constants/item-display-rules')
const { generateImages } = require('./model-env')
const { resolveImageUrl } = require('./resolve-cloud-image')
const { resolveDisplayBgUrl } = require('./resolve-display-bg-url')
const { uploadSeedreamImageToCloud } = require('./upload-generated-image')

function createTempId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function buildPreviewFromItem(item, imageFileId, options = {}) {
  const preview = {
    name: item.name,
    typeName: item.typeName,
    tags: item.tags,
    imageFileId,
    stylingAdvice: item.stylingAdvice || '',
  }
  if (options.includeTempId) {
    preview.tempId = createTempId()
  }
  return preview
}

async function generateDisplayImages(cloud, items, sourceUrl, openid, options = {}) {
  const { prefix = 'wardrobe/items', logTag = 'wardrobe-display' } = options
  const displayItems = selectItemsForDisplayGeneration(items)

  if (items.length > DISPLAY_IMAGE_MAX_COUNT) {
    console.warn(
      `[${logTag}] 临时仅生成前 ${DISPLAY_IMAGE_MAX_COUNT} 件展示图，已跳过 ${items.length - DISPLAY_IMAGE_MAX_COUNT} 件`,
    )
  }

  const count = displayItems.length
  const bgUrl = await resolveDisplayBgUrl(cloud)
  const hasBgRef = Boolean(bgUrl)
  const imageUrls = hasBgRef ? [bgUrl, sourceUrl] : [sourceUrl]

  if (!hasBgRef) {
    console.warn(
      `[${logTag}] 背景参考图未配置或解析失败，降级为无背景参考模式`,
    )
  }

  const { images } = await generateImages({
    prompt: buildItemsDisplayPrompt(displayItems, { hasBgRef }),
    imageUrls,
    maxImages: count,
  })

  const capped = images.slice(0, count)
  const imageFileIds = []
  const failed = []

  for (let i = 0; i < count; i += 1) {
    const imageResult = capped[i]
    if (!imageResult) {
      failed.push({ index: i, message: '展示图生成缺失' })
      imageFileIds.push(null)
      continue
    }
    try {
      const fileId = await uploadSeedreamImageToCloud(cloud, imageResult, {
        prefix,
        openid,
        index: i,
      })
      if (!fileId) {
        failed.push({ index: i, message: '展示图上传失败' })
        imageFileIds.push(null)
        continue
      }
      imageFileIds.push(fileId)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      failed.push({ index: i, message })
      imageFileIds.push(null)
    }
  }

  return { displayItems, imageFileIds, failed }
}

function mergePreviews(displayItems, imageFileIds, partialFailed, options = {}) {
  const previews = []
  const failed = [...partialFailed]

  for (let i = 0; i < displayItems.length; i += 1) {
    const imageFileId = imageFileIds[i]
    if (!imageFileId) {
      if (!failed.some((entry) => entry.index === i)) {
        failed.push({ index: i, message: '展示图生成缺失' })
      }
      continue
    }
    previews.push(buildPreviewFromItem(displayItems[i], imageFileId, options))
  }

  return { previews, failed }
}

async function generateDisplayPreviewsForBatch(cloud, items, sourceUrl, openid) {
  const { displayItems, imageFileIds } = await generateDisplayImages(
    cloud,
    items,
    sourceUrl,
    openid,
    { logTag: 'process-recognition-batch' },
  )

  const previews = []
  for (let i = 0; i < displayItems.length; i += 1) {
    const fileId = imageFileIds[i]
    if (!fileId) continue
    previews.push(
      buildPreviewFromItem(displayItems[i], fileId, { includeTempId: true }),
    )
  }
  return previews
}

async function runWardrobeDisplayPipeline(cloud, { fileID, items, openid, options = {} }) {
  const { deleteSource = false } = options
  const normalized = Array.isArray(items) ? items : []
  const displayItems = selectItemsForDisplayGeneration(normalized)
  const sourceUrl = await resolveImageUrl(cloud, fileID)

  const { imageFileIds, failed } = await generateDisplayImages(
    cloud,
    normalized,
    sourceUrl,
    openid,
    { logTag: 'generate-wardrobe-display' },
  )

  const { previews, failed: mergedFailed } = mergePreviews(
    displayItems,
    imageFileIds,
    failed,
  )

  if (deleteSource && previews.length > 0) {
    try {
      await cloud.deleteFile({ fileList: [fileID] })
    } catch {
      // 原图删除失败不阻断主流程
    }
  }

  return { previews, failed: mergedFailed, displayItems }
}

module.exports = {
  createTempId,
  buildPreviewFromItem,
  generateDisplayImages,
  mergePreviews,
  generateDisplayPreviewsForBatch,
  runWardrobeDisplayPipeline,
}
