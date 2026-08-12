const cloud = require('wx-server-sdk')
const {
  resolveImageUrls,
  generateSeedreamImage,
} = require('./utils/doubao-vision')
const { buildTryonPrompt } = require('./constants/tryon-image-rules')
const { uploadSeedreamImageToCloud } = require('./utils/upload-generated-image')
const { resolveModelTemplateUrl } = require('./utils/resolve-model-template-url')
const { resolvePoseUrl } = require('./utils/resolve-pose-url')
const { resolveTryonBgUrl } = require('./utils/resolve-tryon-bg-url')
const { OUTFIT_SESSION, ERROR_INSUFFICIENT } = require('./constants/credits')
const {
  hold,
  settle,
  release,
  ERROR_INSUFFICIENT: CREDITS_INSUFFICIENT,
} = require('./utils/credits')

const MAX_REFERENCE_IMAGES = 10

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const {
    imageFileIds = [],
    heightCm,
    weightKg,
    gender,
    pieceLabels = [],
    pieceTypeNames = [],
    weatherConditionCode,
    creditHoldId: inputHoldId,
  } = event || {}

  let creditHoldId = inputHoldId || null
  let ownHold = false
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
    if (typeof heightCm !== 'number' || typeof weightKg !== 'number') {
      return { error: 'INVALID_PROFILE', message: '缺少有效身高体重信息' }
    }

    const fileIds = imageFileIds.filter(Boolean)
    if (fileIds.length === 0) {
      return { error: 'NO_IMAGES', message: '缺少衣物图片' }
    }

    if (!creditHoldId) {
      try {
        const held = await hold(db, openid, OUTFIT_SESSION, 'outfit_session', '')
        creditHoldId = held.holdId
        ownHold = true
      } catch (holdErr) {
        const message =
          holdErr instanceof Error ? holdErr.message : '积分预占失败'
        if (holdErr?.error === CREDITS_INSUFFICIENT) {
          return { error: ERROR_INSUFFICIENT, message }
        }
        return { error: 'CREDITS_HOLD_FAILED', message }
      }
    }

    const clothingUrls = await resolveImageUrls(cloud, fileIds)
    if (clothingUrls.length === 0) {
      if (creditHoldId) {
        await release(db, openid, creditHoldId)
      }
      return { error: 'NO_IMAGE_URL', message: '无法解析图片' }
    }

    const modelUrl = await resolveModelTemplateUrl(cloud, db, openid, gender)
    const poseUrl = await resolvePoseUrl(cloud)
    const bgUrl = await resolveTryonBgUrl(cloud)
    const hasModelTemplate = Boolean(modelUrl)
    const hasPoseRef = Boolean(poseUrl)
    const hasBgRef = Boolean(bgUrl)
    const fixedRefs = [modelUrl, poseUrl, bgUrl].filter(Boolean)
    const maxClothing = Math.max(0, MAX_REFERENCE_IMAGES - fixedRefs.length)
    const clothingCount = Math.min(clothingUrls.length, maxClothing)
    const imageUrls = [...fixedRefs, ...clothingUrls.slice(0, maxClothing)]

    try {
      const result = await generateSeedreamImage({
        prompt: buildTryonPrompt({
          heightCm,
          weightKg,
          gender,
          pieceLabels,
          pieceTypeNames,
          imageCount: clothingCount,
          hasModelTemplate,
          hasPoseRef,
          hasBgRef,
          weatherConditionCode,
        }),
        imageUrls,
      })

      if (!result) {
        if (creditHoldId) {
          await release(db, openid, creditHoldId)
        }
        return { error: 'SEEDREAM_FAILED', message: 'Seedream 未返回可用图片' }
      }

      const coverFileId = await uploadSeedreamImageToCloud(cloud, result, {
        prefix: 'tryon',
        openid,
      })
      if (!coverFileId) {
        if (creditHoldId) {
          await release(db, openid, creditHoldId)
        }
        return { error: 'SEEDREAM_FAILED', message: 'Seedream 未返回可用图片' }
      }

      if (creditHoldId) {
        await settle(db, openid, creditHoldId, OUTFIT_SESSION)
        creditHoldId = null
      }

      const [coverUrl] = await resolveImageUrls(cloud, [coverFileId])
      return { coverFileId, coverUrl: coverUrl || undefined }
    } catch (err) {
      if (creditHoldId) {
        try {
          await release(db, openid, creditHoldId)
        } catch (releaseErr) {
          console.warn(
            '[generate-tryon-image] 积分释放失败:',
            releaseErr instanceof Error ? releaseErr.message : releaseErr,
          )
        }
        creditHoldId = null
      }

      const message = err instanceof Error ? err.message : String(err)
      return { error: 'SEEDREAM_FAILED', message }
    }
  } catch (err) {
    if (openid && creditHoldId && ownHold) {
      try {
        await release(db, openid, creditHoldId)
      } catch (releaseErr) {
        console.warn(
          '[generate-tryon-image] 外层积分释放失败:',
          releaseErr instanceof Error ? releaseErr.message : releaseErr,
        )
      }
    }

    const message = err instanceof Error ? err.message : String(err)
    return { error: 'GENERATE_FAILED', message }
  }
}
