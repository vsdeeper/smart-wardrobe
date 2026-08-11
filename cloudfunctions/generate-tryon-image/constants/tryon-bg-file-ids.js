/**
 * 试穿场景背景云存储 fileID。
 *
 * 上传步骤见 cloudfunctions/README.md「generate-tryon-image」：
 * 1. 将 output/tryon-bgs/light-scene-bg-1920.jpg 上传到云存储目录 tryon-bgs/
 * 2. 把得到的 cloud:// fileID 填入 LIGHT_SCENE_BG_FILE_ID
 * 3. 重新部署 generate-tryon-image
 *
 * 空字符串表示尚未配置；运行时降级为纯文案背景描述。
 */
const LIGHT_SCENE_BG_FILE_ID =
  'cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/tryon-bgs/light-scene-bg-1920.jpg'

module.exports = {
  LIGHT_SCENE_BG_FILE_ID,
}
