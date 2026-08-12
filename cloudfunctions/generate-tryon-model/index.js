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
const { requireEnv } = require('./utils/env')
const {
  analyzePersonGender,
  resolveGenderBlock,
} = require('./utils/analyze-person-gender')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 严格性别校验守卫：检测照片人物性别，任何无法明确判断的情况都返回阻断结论。
 * 仅「确定性别 + 高置信 + 与资料性别一致」才放行；detectedGender 供成功后入库存储。
 */
async function resolvePersonGenderGuard(imageUrl, profileGender) {
  let baseUrl
  try {
    baseUrl = requireEnv('DOUBAO_API_BASE_URL')
  } catch (err) {
    console.warn('[generate-tryon-model] 缺 DOUBAO_API_BASE_URL:', err)
    return {
      blocked: true,
      code: 'GENDER_UNKNOWN',
      message: '性别识别暂不可用，请稍后重试',
    }
  }

  const seedModel = process.env.DOUBAO_SEED_MODEL
  if (!seedModel) {
    console.warn('[generate-tryon-model] 未配置 DOUBAO_SEED_MODEL，性别识别不可用')
    return {
      blocked: true,
      code: 'GENDER_UNKNOWN',
      message: '性别识别暂不可用，请稍后重试',
    }
  }

  try {
    const analysis = await analyzePersonGender({
      imageUrl,
      apiKey: process.env.DOUBAO_API_KEY,
      baseUrl,
      model: seedModel,
    })
    const block = resolveGenderBlock(analysis, profileGender)
    const detectedGender =
      analysis.gender === 'male' || analysis.gender === 'female'
        ? analysis.gender
        : undefined
    return { ...block, detectedGender }
  } catch (err) {
    console.warn('[generate-tryon-model] 性别检测异常，阻断:', err)
    return {
      blocked: true,
      code: 'GENDER_UNKNOWN',
      message: '性别识别暂不可用，请稍后重试',
    }
  }
}

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
      return { error: 'NO_SOURCE_IMAGE', message: '缺少参考照' }
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

    const sourceUrl = await resolveImageUrls(cloud, [sourceFileId]).then(
      (urls) => urls[0] || null,
    )

    if (!sourceUrl) {
      await release(db, openid, creditHoldId)
      return { error: 'NO_IMAGE_URL', message: '无法解析参考照' }
    }

    // 严格性别校验：仅「确定且与资料性别一致」放行，否则阻断（不扣费）
    const [outfitUrl, genderGuard] = await Promise.all([
      resolveOutfitReferenceUrl(cloud, gender),
      resolvePersonGenderGuard(sourceUrl, gender),
    ])

    if (genderGuard.blocked) {
      await release(db, openid, creditHoldId)
      creditHoldId = null
      return { error: genderGuard.code, message: genderGuard.message }
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

      return { fileId, coverUrl, gender: genderGuard.detectedGender }
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
