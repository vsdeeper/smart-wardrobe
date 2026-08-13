const cloud = require('wx-server-sdk')
const { resolveImageUrls } = require('./utils/resolve-cloud-image')
const { generateImage } = require('./utils/model-env')
const { uploadGeneratedImageToCloud } = require('./utils/upload-generated-image')
const { resolveOutfitReferenceUrl } = require('./utils/resolve-outfit-reference-url')
const { buildTryonModelGenerationPrompt } = require('./constants/tryon-model-generation-rules')
const {
  TRYON_MODEL_BASE,
  TRYON_MODEL_TOTAL,
  ERROR_INSUFFICIENT,
} = require('./constants/credits')
const {
  hold,
  settle,
  release,
  ERROR_INSUFFICIENT: CREDITS_INSUFFICIENT,
} = require('./utils/credits')
const {
  getModelApiKey,
  requireModelBaseUrl,
  getChatModel,
  getImageModel,
} = require('./utils/model-env')
const {
  analyzePersonGender,
  resolveGenderBlock,
} = require('./utils/analyze-person-gender')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 严格性别校验守卫：检测照片人物性别，任何无法明确判断的情况都返回阻断结论。
 * 仅「确定性别 + 高置信 + 与资料性别一致」才放行；detectedGender 供成功后入库存储。
 * chargeBase：性别检测 API 是否已完成（收到 200 响应）→ 阻断时据此决定是否收基础费。
 */
async function resolvePersonGenderGuard(imageUrl, profileGender) {
  try {
    getModelApiKey()
    requireModelBaseUrl()
    getChatModel()
  } catch (err) {
    console.warn('[generate-tryon-model] 模型配置缺失，性别识别不可用:', err)
    return {
      blocked: true,
      code: 'GENDER_UNKNOWN',
      message: '性别识别暂不可用，请稍后重试',
      chargeBase: false,
    }
  }

  try {
    const analysis = await analyzePersonGender({ imageUrl })
    const block = resolveGenderBlock(analysis, profileGender)
    const detectedGender =
      analysis.gender === 'male' || analysis.gender === 'female'
        ? analysis.gender
        : undefined
    return { ...block, detectedGender, chargeBase: true }
  } catch (err) {
    console.warn('[generate-tryon-model] 性别检测异常，阻断:', err)
    return {
      blocked: true,
      code: 'GENDER_UNKNOWN',
      message: '性别识别暂不可用，请稍后重试',
      // 传输层/HTTP 报错（API 未完成）→ 免费；200 已返回但解析失败 → 已产生调用 → 收基础费
      chargeBase: err?.code !== 'LLM_API_ERROR',
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
      const held = await hold(
        db,
        openid,
        TRYON_MODEL_TOTAL,
        'tryon_model',
        '',
      )
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

    // 严格性别校验：仅「确定且与资料性别一致」放行，否则阻断（检测已完成则收检测基础费）
    const [outfitUrl, genderGuard] = await Promise.all([
      resolveOutfitReferenceUrl(cloud, gender),
      resolvePersonGenderGuard(sourceUrl, gender),
    ])

    if (genderGuard.blocked) {
      // 检测 API 已完成 → 收检测基础费；未产生调用 / API 报错 → 整单释放
      if (genderGuard.chargeBase) {
        await settle(db, openid, creditHoldId, TRYON_MODEL_BASE)
      } else {
        await release(db, openid, creditHoldId)
      }
      creditHoldId = null
      return { error: genderGuard.code, message: genderGuard.message }
    }

    const imageUrls = outfitUrl ? [sourceUrl, outfitUrl] : [sourceUrl]

    try {
      const result = await generateImage({
        prompt: buildTryonModelGenerationPrompt(),
        imageUrls,
      })

      if (!result) {
        // 检测已完成但 Seedream 未出图：只收检测基础费，成果费免收
        await settle(db, openid, creditHoldId, TRYON_MODEL_BASE)
        creditHoldId = null
        return { error: 'SEEDREAM_FAILED', message: 'Seedream 未返回可用图片' }
      }

      const fileId = await uploadGeneratedImageToCloud(cloud, result, {
        prefix: 'tryon-models',
        openid,
      })

      if (!fileId) {
        // 生成成功但上传失败：只收检测基础费
        await settle(db, openid, creditHoldId, TRYON_MODEL_BASE)
        creditHoldId = null
        return { error: 'UPLOAD_FAILED', message: '模特图上传失败' }
      }

      await settle(db, openid, creditHoldId, TRYON_MODEL_TOTAL)

      let coverUrl = null
      try {
        const [url] = await resolveImageUrls(cloud, [fileId])
        coverUrl = url || null
      } catch {
        // 非致命：客户端可自行解析临时链
      }

      return { fileId, coverUrl, gender: genderGuard.detectedGender }
    } catch (err) {
      // Seedream 抛错（成果 API 失败）：成果费免收；检测已完成 → 仍收检测基础费
      await settle(db, openid, creditHoldId, TRYON_MODEL_BASE)
      creditHoldId = null
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
