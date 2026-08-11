/**
 * 固定模特模板云存储 fileID 清单。
 *
 * 上传步骤见 cloudfunctions/README.md「generate-tryon-image」：
 * 1. 将 output/model-templates/*-standard-*-1920.jpg 上传到云存储目录 model-templates/
 * 2. 把得到的 cloud:// fileID 填入下方对应键（键名不含 -1920，与匹配逻辑一致）
 * 3. pnpm cf:sync-shared 后重新部署 generate-tryon-image
 *
 * 空字符串表示尚未配置；匹配逻辑会回退或降级为纯文案模式。
 */
module.exports = {
  "female-standard-01":
    "cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/model-templates/female-standard-01-1920.jpg",
  "female-standard-02":
    "cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/model-templates/female-standard-02-1920.jpg",
  "female-standard-03":
    "cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/model-templates/female-standard-03-1920.jpg",
  "male-standard-01":
    "cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/model-templates/male-standard-01-1920.jpg",
  "male-standard-02":
    "cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/model-templates/male-standard-02-1920.jpg",
  "male-standard-03":
    "cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/model-templates/male-standard-03-1920.jpg",
};
