/**
 * 试穿姿势库云存储 fileID 清单。
 *
 * 上传步骤见 cloudfunctions/README.md「generate-tryon-image」：
 * 1. 将 output/poses/unisex-pose-0{1-6}-1920.jpg 上传到云存储目录 poses/
 * 2. 把得到的 cloud:// fileID 填入下方对应键（键名不含 -1920）
 * 3. 重新部署 generate-tryon-image
 *
 * 空字符串表示尚未配置；运行时随机选取已配置项，全空则降级为文案姿势。
 */
module.exports = {
  'unisex-pose-01':
    'cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/poses/unisex-pose-01-1920.jpg',
  'unisex-pose-02':
    'cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/poses/unisex-pose-02-1920.jpg',
  'unisex-pose-03':
    'cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/poses/unisex-pose-03-1920.jpg',
  'unisex-pose-04':
    'cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/poses/unisex-pose-04-1920.jpg',
  'unisex-pose-05':
    'cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/poses/unisex-pose-05-1920.jpg',
  'unisex-pose-06':
    'cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/poses/unisex-pose-06-1920.jpg',
}
