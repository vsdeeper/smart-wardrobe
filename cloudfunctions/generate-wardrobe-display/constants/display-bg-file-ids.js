/**
 * 衣物单品展示图预设背景云存储 fileID。
 *
 * 上传步骤：
 * 1. 将 output/item-bgs/clothing-wall-bg-1920-light.jpg 上传到云存储目录 item-bgs/
 * 2. 把得到的 cloud:// fileID 填入 CLOTHING_WALL_BG_FILE_ID
 * 3. pnpm cf:sync-shared 后重新部署 process-recognition-batch / generate-wardrobe-display
 *
 * 空字符串表示尚未配置；pipeline 将降级为无背景参考图模式。
 */
const CLOTHING_WALL_BG_FILE_ID =
  'cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/item-bgs/clothing-wall-bg-1920-light.jpg'

module.exports = {
  CLOTHING_WALL_BG_FILE_ID,
}
