const cloud = require('wx-server-sdk')
const {
  resolveImageUrls,
  generateSeedreamImage,
} = require('./utils/doubao-vision')
const { uploadSeedreamImageToCloud } = require('./utils/upload-generated-image')
const { resolveOutfitReferenceUrl } = require('./utils/resolve-outfit-reference-url')
const { buildTryonModelGenerationPrompt } = require('./constants/tryon-model-generation-rules')
const { TRYON_MODEL, ERROR_INSUFFICIENT } = require('./constants/credits')
const {
  hold,
  settle,
  release,
  ERROR_INSUFFICIENT: CREDITS_INSUFFICIENT,
} = require('./utils/credits')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { sourceFileId, gender } = event || {}

  let creditHoldId = null
  let openid = null

  try {
    const wxContext = cloud.getWXContext()
    openid = wxContext.OPENID
    if (!openid) {
      return { error: 'NO_OPENID', message: '无法获取用户身份' }
    }

    if (gender !== 'male' && gender !== 'female') {
      return { error: 'INVALID_PROFILE', message: '缺少有效性别信息' }
    }

    if (!sourceFileId || typeof sourceFileId !== 'string') {
      return { error: 'NO_SOURCE_IMAGE', message: '缺少全身参考照' }
    }

    try {
      const held = await hold(db, openid, TRYON_MODEL, 'tryon_model', '')
      creditHoldId = held.holdId
    } catch (holdErr) {
      const message =
        holdErr instanceof Error ? holdErr.message : '积分预占失败'
      if (holdErr?.error === CREDITS_INSUFFICIENT) {
        return { error: ERROR_INSUFFICIENT, message }
      }
      return { error: 'CREDITS_HOLD_FAILED', message }
    }

    const [sourceUrl, outfitUrl] = await Promise.all([
      resolveImageUrls(cloud, [sourceFileId]).then((urls) => urls[0] || null),
      resolveOutfitReferenceUrl(cloud, gender),
    ])

    if (!sourceUrl) {
      await release(db, openid, creditHoldId)
      return { error: 'NO_IMAGE_URL', message: '无法解析全身参考照' }
    }

    const imageUrls = outfitUrl ? [sourceUrl, outfitUrl] : [sourceUrl]

    try {
      const result = await generateSeedreamImage({
        prompt: buildTryonModelGenerationPrompt(),
        imageUrls,
      })

      if (!result) {
        await release(db, openid, creditHoldId)
        return { error: 'SEEDREAM_FAILED', message: 'Seedream 未返回可用图片' }
      }

      const fileId = await uploadSeedreamImageToCloud(cloud, result, {
        prefix: 'tryon-models',
        openid,
      })

      if (!fileId) {
        await release(db, openid, creditHoldId)
        return { error: 'UPLOAD_FAILED', message: '模特图上传失败' }
      }

      await settle(db, openid, creditHoldId, TRYON_MODEL)

      let coverUrl = null
      try {
        const [url] = await resolveImageUrls(cloud, [fileId])
        coverUrl = url || null
      } catch {
        // 非致命：客户端可自行解析临时链
      }

      return { fileId, coverUrl }
    } catch (err) {
      await release(db, openid, creditHoldId)
      const message = err instanceof Error ? err.message : '生成失败'
      return { error: 'SEEDREAM_FAILED', message }
    }
  } catch (err) {
    if (creditHoldId && openid) {
      await release(db, openid, creditHoldId)
    }
    const message = err instanceof Error ? err.message : '生成失败'
    return { error: 'GENERATE_FAILED', message }
  }
}
