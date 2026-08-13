const { CLOTHING_WALL_BG_FILE_ID } = require('../constants/display-bg-file-ids')
const { resolveImageUrl } = require('./resolve-cloud-image')

/**
 * 解析衣物单品展示图预设背景临时 URL。
 * @param {import('wx-server-sdk').Cloud} cloud 云开发实例
 * @returns {Promise<string|null>} 背景图临时 URL；未配置或解析失败时返回 null
 */
async function resolveDisplayBgUrl(cloud) {
  const fileId = String(CLOTHING_WALL_BG_FILE_ID ?? '').trim()
  if (!fileId) return null

  try {
    return (await resolveImageUrl(cloud, fileId)) || null
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[resolve-display-bg-url] 背景参考图解析失败，降级为无背景参考:', message)
    return null
  }
}

module.exports = { resolveDisplayBgUrl }
