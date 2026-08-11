const { resolveImageUrls } = require('./doubao-vision')
const { pickRandomPose } = require('./pose-match')

/**
 * 随机选取姿势参考图并解析为临时 URL。
 * @param {import('wx-server-sdk').Cloud} cloud 云开发实例
 * @returns {Promise<string|null>} 姿势图临时 URL；未配置或解析失败时返回 null
 */
async function resolvePoseUrl(cloud) {
  const picked = pickRandomPose()
  if (!picked) return null

  try {
    const [poseUrl] = await resolveImageUrls(cloud, [picked.fileId])
    return poseUrl || null
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[resolve-pose-url] 姿势参考图解析失败，降级为文案姿势:', message)
    return null
  }
}

module.exports = { resolvePoseUrl }
