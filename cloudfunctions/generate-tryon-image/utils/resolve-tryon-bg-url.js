const { LIGHT_SCENE_BG_FILE_ID } = require('../constants/tryon-bg-file-ids')
const { resolveImageUrls } = require('./doubao-vision')

/**
 * 解析试穿场景背景临时 URL。
 * @param {import('wx-server-sdk').Cloud} cloud 云开发实例
 * @returns {Promise<string|null>} 背景图临时 URL；未配置或解析失败时返回 null
 */
async function resolveTryonBgUrl(cloud) {
  const fileId = String(LIGHT_SCENE_BG_FILE_ID ?? '').trim()
  if (!fileId) return null

  try {
    const [bgUrl] = await resolveImageUrls(cloud, [fileId])
    return bgUrl || null
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(
      '[resolve-tryon-bg-url] 背景参考图解析失败，降级为文案背景:',
      message,
    )
    return null
  }
}

module.exports = { resolveTryonBgUrl }
