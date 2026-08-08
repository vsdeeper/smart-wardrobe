/**
 * 异步处理衣物识别批次：对 coverFileId 原图执行识别 + 展示图生成，写回 recognition_batches。
 * 一图一批次，封面原图保留供列表展示。
 */
const cloud = require('wx-server-sdk')
const {
  buildSystemPrompt,
  USER_PROMPT,
  parseRecognitionItems,
  filterItemsByUserGender,
} = require('./common/recognitionRules')
const {
  buildItemsDisplayPrompt,
  DISPLAY_IMAGE_MAX_COUNT,
  selectItemsForDisplayGeneration,
} = require('./common/itemDisplayImageRules')
const {
  generateSeedreamImages,
  getItemDisplaySize,
} = require('./common/doubaoVision')
const { requireEnv } = require('./common/env')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const DEFAULT_TEMPERATURE = 0.1
const COLLECTION = 'recognition_batches'

function createTempId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function resolveImageUrl(fileID) {
  const res = await cloud.getTempFileURL({ fileList: [fileID] })
  const file = res.fileList?.[0]
  if (!file || file.status !== 0) {
    throw new Error('无法获取图片临时链接')
  }
  return file.tempFileURL
}

function resolveVisionTemperature() {
  const raw = process.env.DOUBAO_SEED_TEMPERATURE
  const parsed =
    raw === undefined || raw === '' ? DEFAULT_TEMPERATURE : parseFloat(raw)
  if (Number.isNaN(parsed)) return DEFAULT_TEMPERATURE
  return Math.min(2, Math.max(0, parsed))
}

function parseRecognitionContent(content) {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI 返回格式无效')
  }
  const parsed = JSON.parse(jsonMatch[0])
  return parseRecognitionItems(parsed)
}

async function recognizeItemsFromImage(imageUrl, apiKey, baseUrl, model) {
  const temperature = resolveVisionTemperature()
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: USER_PROMPT },
          ],
        },
      ],
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    const errMsg =
      data?.error?.message || data?.message || `HTTP ${response.status}`
    throw new Error(errMsg)
  }

  const content = data?.choices?.[0]?.message?.content ?? ''
  return parseRecognitionContent(content)
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
  const ext =
    contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png'
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
    tempId: createTempId(),
    name: item.name,
    typeName: item.typeName,
    tags: item.tags,
    imageFileId,
    stylingAdvice: item.stylingAdvice || '',
  }
}

async function generateDisplayPreviews(items, sourceUrl, openid) {
  const displayItems = selectItemsForDisplayGeneration(items)
  if (items.length > DISPLAY_IMAGE_MAX_COUNT) {
    console.warn(
      `[process-recognition-batch] 临时仅生成前 ${DISPLAY_IMAGE_MAX_COUNT} 件展示图，已跳过 ${items.length - DISPLAY_IMAGE_MAX_COUNT} 件`,
    )
  }

  const M = displayItems.length
  const { images } = await generateSeedreamImages({
    prompt: buildItemsDisplayPrompt(displayItems),
    imageUrls: [sourceUrl],
    maxImages: M,
    size: getItemDisplaySize(),
  })

  const capped = images.slice(0, M)
  const previews = []

  for (let i = 0; i < M; i++) {
    const imageResult = capped[i]
    if (!imageResult) continue
    try {
      const fileId = await uploadSeedreamImageToCloud(imageResult, openid, i)
      if (!fileId) continue
      previews.push(buildPreviewFromItem(displayItems[i], fileId))
    } catch (err) {
      console.warn('[process-recognition-batch] 展示图上传失败', err)
    }
  }

  return previews
}

async function updateBatch(batchId, data) {
  await db
    .collection(COLLECTION)
    .doc(batchId)
    .update({
      data: {
        ...data,
        updatedAt: Date.now(),
      },
    })
}

async function failBatch(batchId, message, extra = {}) {
  try {
    await updateBatch(batchId, {
      status: 'failed',
      errorMessage: message,
      ...extra,
    })
  } catch (err) {
    console.warn('[process-recognition-batch] failBatch 写库失败', err)
  }
}

async function processCoverImage(
  fileID,
  userGender,
  apiKey,
  baseUrl,
  seedModel,
  openid,
) {
  const imageUrl = await resolveImageUrl(fileID)
  const rawItems = await recognizeItemsFromImage(
    imageUrl,
    apiKey,
    baseUrl,
    seedModel,
  )
  const { items, filteredCount } = filterItemsByUserGender(rawItems, userGender)

  if (items.length === 0) {
    throw new Error(
      filteredCount > 0
        ? '未识别到符合您性别的衣物'
        : '未识别到衣物单品',
    )
  }

  const previews = await generateDisplayPreviews(items, imageUrl, openid)
  if (previews.length === 0) {
    throw new Error('未能生成展示图')
  }

  return previews
}

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
      await updateBatch(batchId, {
        progress: { current: 1, total: 1, phase: 'generating' },
      })
      const items = await processCoverImage(
        coverFileId,
        userGender,
        apiKey,
        baseUrl,
        seedModel,
        openid,
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
