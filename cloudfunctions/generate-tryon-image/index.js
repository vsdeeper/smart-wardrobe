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

const MAX_REFERENCE_IMAGES = 10

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

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

    const modelUrl = await resolveModelTemplateUrl(cloud, openid, gender)
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
        return { error: 'SEEDREAM_FAILED', message: 'Seedream 未返回可用图片' }
      }

      const coverFileId = await uploadSeedreamImageToCloud(cloud, result, {
        prefix: 'tryon',
        openid,
      })
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
