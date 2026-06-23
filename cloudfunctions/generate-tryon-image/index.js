const cloud = require('wx-server-sdk')
const {
  resolveImageUrls,
  generateSeedreamImage,
} = require('./common/doubaoVision')
const { buildTryonPrompt } = require('./common/tryonImageRules')

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

exports.main = async (event) => {
  const {
    imageFileIds = [],
    heightCm,
    weightKg,
    gender,
    pieceLabels = [],
    pieceTypeNames = [],
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

    const imageUrls = await resolveImageUrls(cloud, fileIds)

    if (imageUrls.length === 0) {
      return { error: 'NO_IMAGE_URL', message: '无法解析图片' }
    }

    let coverFileId
    let coverUrl

    try {
      const result = await generateSeedreamImage({
        prompt: buildTryonPrompt({
          heightCm,
          weightKg,
          gender,
          pieceLabels,
          pieceTypeNames,
          imageCount: imageUrls.length,
        }),
        imageUrls,
      })

      if (result.url) {
        coverUrl = result.url
      } else if (result.b64) {
        const b64Value = result.b64.startsWith('data:')
          ? result.b64
          : `data:image/png;base64,${result.b64}`
        coverFileId = await uploadBase64ToCloud(b64Value, openid)
        const [resolved] = await resolveImageUrls(cloud, [coverFileId])
        if (resolved) coverUrl = resolved
      }

      if (!coverUrl && !coverFileId) {
        return { error: 'SEEDREAM_FAILED', message: 'Seedream 未返回可用图片' }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { error: 'SEEDREAM_FAILED', message }
    }

    return { coverFileId, coverUrl }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: 'GENERATE_FAILED', message }
  }
}
