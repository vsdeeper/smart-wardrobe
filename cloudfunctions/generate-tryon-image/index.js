const cloud = require('wx-server-sdk')
const {
  resolveImageUrls,
  generateSeedreamImage,
} = require('./common/doubaoVision')
const { buildTryonPrompt } = require('./common/tryonImageRules')
const {
  matchModelTemplate,
  resolveModelTemplateFileId,
} = require('./common/modelTemplateMatch')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

async function uploadBase64ToCloud(base64Data, openid) {
  const raw = String(base64Data ?? '').trim()
  const match = raw.match(/^data:image\/(\w+);base64,(.+)$/)
  const ext = match ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'png'
  const base64Body = match ? match[2] : raw
  const buffer = Buffer.from(base64Body, 'base64')
  const cloudPath = `tryon/${openid}/${Date.now()}.${ext}`
  const uploadRes = await cloud.uploadFile({
    cloudPath,
    fileContent: buffer,
  })
  return uploadRes.fileID
}

async function uploadUrlToCloud(imageUrl, openid) {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`下载生成图失败 HTTP ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'image/png'
  const ext =
    contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png'
  const cloudPath = `tryon/${openid}/${Date.now()}.${ext}`
  const uploadRes = await cloud.uploadFile({
    cloudPath,
    fileContent: buffer,
  })
  return uploadRes.fileID
}

async function uploadSeedreamImageToCloud(imageResult, openid) {
  if (imageResult.b64) {
    const b64Value = imageResult.b64.startsWith('data:')
      ? imageResult.b64
      : `data:image/png;base64,${imageResult.b64}`
    return uploadBase64ToCloud(b64Value, openid)
  }
  if (imageResult.url) {
    return uploadUrlToCloud(imageResult.url, openid)
  }
  return null
}

async function resolveModelTemplateUrl(openid, gender) {
  const { templateId } = matchModelTemplate({ gender, openid })
  const resolved = resolveModelTemplateFileId(templateId)
  if (!resolved) return null

  try {
    const [modelUrl] = await resolveImageUrls(cloud, [resolved.fileId])
    return modelUrl || null
  } catch {
    return null
  }
}

exports.main = async (event) => {
  const {
    imageFileIds = [],
    heightCm,
    weightKg,
    gender,
    pieceLabels = [],
    pieceTypeNames = [],
    weatherConditionCode,
  } = event || {}

  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    if (!openid) {
      return { error: 'NO_OPENID', message: '无法获取用户身份' }
    }

    if (gender !== 'male' && gender !== 'female') {
      return { error: 'INVALID_PROFILE', message: '缺少有效性别信息' }
    }
    if (typeof heightCm !== 'number' || typeof weightKg !== 'number') {
      return { error: 'INVALID_PROFILE', message: '缺少有效身高体重信息' }
    }

    const fileIds = imageFileIds.filter(Boolean)
    if (fileIds.length === 0) {
      return { error: 'NO_IMAGES', message: '缺少衣物图片' }
    }

    const clothingUrls = await resolveImageUrls(cloud, fileIds)

    if (clothingUrls.length === 0) {
      return { error: 'NO_IMAGE_URL', message: '无法解析图片' }
    }

    const modelUrl = await resolveModelTemplateUrl(openid, gender)
    const hasModelTemplate = Boolean(modelUrl)
    const imageUrls = hasModelTemplate
      ? [modelUrl, ...clothingUrls]
      : clothingUrls

    try {
      const result = await generateSeedreamImage({
        prompt: buildTryonPrompt({
          heightCm,
          weightKg,
          gender,
          pieceLabels,
          pieceTypeNames,
          imageCount: clothingUrls.length,
          hasModelTemplate,
          weatherConditionCode,
        }),
        imageUrls,
      })

      if (!result) {
        return { error: 'SEEDREAM_FAILED', message: 'Seedream 未返回可用图片' }
      }

      const coverFileId = await uploadSeedreamImageToCloud(result, openid)
      if (!coverFileId) {
        return { error: 'SEEDREAM_FAILED', message: 'Seedream 未返回可用图片' }
      }

      const [coverUrl] = await resolveImageUrls(cloud, [coverFileId])
      return { coverFileId, coverUrl: coverUrl || undefined }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { error: 'SEEDREAM_FAILED', message }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: 'GENERATE_FAILED', message }
  }
}
