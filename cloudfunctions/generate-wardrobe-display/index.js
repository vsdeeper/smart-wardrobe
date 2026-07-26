const cloud = require('wx-server-sdk')
const {
  buildItemsDisplayPrompt,
  DISPLAY_IMAGE_MAX_COUNT,
  selectItemsForDisplayGeneration,
} = require('./common/itemDisplayImageRules')
const {
  generateSeedreamImages,
  getItemDisplaySize,
} = require('./common/doubaoVision')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

async function resolveImageUrl(fileID) {
  const res = await cloud.getTempFileURL({ fileList: [fileID] })
  const file = res.fileList?.[0]
  if (!file || file.status !== 0) {
    throw new Error('无法获取图片临时链接')
  }
  return file.tempFileURL
}

function normalizeItemInput(raw) {
  if (!raw || typeof raw !== 'object') return null

  const typeName = String(raw.typeName ?? '').trim()
  const name = String(raw.name ?? '').trim()
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((tag) => String(tag ?? '').trim()).filter(Boolean)
    : []
  const stylingAdvice = String(raw.stylingAdvice ?? '').trim()

  if (!typeName || !name) return null

  return { typeName, name, tags, stylingAdvice }
}

function normalizeItemsInput(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('缺少待生成展示图的单品列表')
  }
  const normalized = items.map(normalizeItemInput).filter(Boolean)
  if (normalized.length === 0) {
    throw new Error('单品数据格式无效')
  }
  return normalized
}

async function uploadBase64ToCloud(base64Data, openid, index) {
  const raw = String(base64Data ?? '').trim()
  const match = raw.match(/^data:image\/(\w+);base64,(.+)$/)
  const ext = match ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'png'
  const base64Body = match ? match[2] : raw
  const buffer = Buffer.from(base64Body, 'base64')
  const cloudPath = `wardrobe/items/${openid}/${Date.now()}-${index}.${ext}`
  const uploadRes = await cloud.uploadFile({
    cloudPath,
    fileContent: buffer,
  })
  return uploadRes.fileID
}

async function uploadUrlToCloud(imageUrl, openid, index) {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`下载生成图失败 HTTP ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'image/png'
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png'
  const cloudPath = `wardrobe/items/${openid}/${Date.now()}-${index}.${ext}`
  const uploadRes = await cloud.uploadFile({
    cloudPath,
    fileContent: buffer,
  })
  return uploadRes.fileID
}

async function uploadSeedreamImageToCloud(imageResult, openid, index) {
  if (imageResult.b64) {
    const b64Value = imageResult.b64.startsWith('data:')
      ? imageResult.b64
      : `data:image/png;base64,${imageResult.b64}`
    return uploadBase64ToCloud(b64Value, openid, index)
  }
  if (imageResult.url) {
    return uploadUrlToCloud(imageResult.url, openid, index)
  }
  return null
}

function buildPreviewFromItem(item, imageFileId) {
  return {
    name: item.name,
    typeName: item.typeName,
    tags: item.tags,
    imageFileId,
    stylingAdvice: item.stylingAdvice || '',
  }
}

async function generateDisplayImages(items, sourceUrl, openid) {
  const displayItems = selectItemsForDisplayGeneration(items)
  const M = displayItems.length
  const { images } = await generateSeedreamImages({
    prompt: buildItemsDisplayPrompt(displayItems),
    imageUrls: [sourceUrl],
    maxImages: M,
    size: getItemDisplaySize(),
  })

  const capped = images.slice(0, M)
  const imageFileIds = []
  const failed = []

  for (let i = 0; i < M; i++) {
    const imageResult = capped[i]
    if (!imageResult) {
      failed.push({ index: i, message: '展示图生成缺失' })
      imageFileIds.push(null)
      continue
    }
    try {
      const fileId = await uploadSeedreamImageToCloud(imageResult, openid, i)
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

  return { imageFileIds, failed }
}

function mergePreviews(items, imageFileIds, partialFailed) {
  const previews = []
  const failed = [...partialFailed]

  for (let i = 0; i < items.length; i++) {
    const imageFileId = imageFileIds[i]
    if (!imageFileId) {
      if (!failed.some((entry) => entry.index === i)) {
        failed.push({ index: i, message: '展示图生成缺失' })
      }
      continue
    }
    previews.push(buildPreviewFromItem(items[i], imageFileId))
  }

  return { previews, failed }
}

async function deleteSourceFile(fileID) {
  try {
    await cloud.deleteFile({ fileList: [fileID] })
  } catch {
    // 原图删除失败不阻断主流程
  }
}

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

    if (!process.env.DOUBAO_API_KEY) {
      return { error: 'PROVIDER_CONFIG', message: '未配置 DOUBAO_API_KEY 环境变量' }
    }
    if (!process.env.DOUBAO_VISION_MODEL) {
      return { error: 'PROVIDER_CONFIG', message: '未配置 DOUBAO_VISION_MODEL 环境变量' }
    }

    const items = normalizeItemsInput(rawItems)
    const displayItems = selectItemsForDisplayGeneration(items)
    const sourceUrl = await resolveImageUrl(fileID)

    if (items.length > DISPLAY_IMAGE_MAX_COUNT) {
      console.warn(
        `[generate-wardrobe-display] 临时仅生成前 ${DISPLAY_IMAGE_MAX_COUNT} 件展示图，已跳过 ${items.length - DISPLAY_IMAGE_MAX_COUNT} 件`,
      )
    }

    let imageFileIds
    let uploadFailed
    try {
      const result = await generateDisplayImages(items, sourceUrl, openid)
      imageFileIds = result.imageFileIds
      uploadFailed = result.failed
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { error: 'SEEDREAM_FAILED', message }
    }

    const { previews, failed } = mergePreviews(displayItems, imageFileIds, uploadFailed)

    if (previews.length === 0) {
      return { error: 'GENERATE_FAILED', message: '未能生成任何单品展示图', failed }
    }

    await deleteSourceFile(fileID)

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
