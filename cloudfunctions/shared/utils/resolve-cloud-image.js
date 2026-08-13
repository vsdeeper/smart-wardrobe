/**
 * 微信云存储 fileID → 临时 HTTPS URL（与模型供应商无关）。
 */

async function resolveImageUrl(cloud, fileID) {
  const res = await cloud.getTempFileURL({ fileList: [fileID] })
  const file = res.fileList?.[0]
  if (!file || file.status !== 0) {
    throw new Error('无法获取图片临时链接')
  }
  return file.tempFileURL
}

async function resolveImageUrls(cloud, fileIDs) {
  const unique = [...new Set(fileIDs.filter(Boolean))]
  if (unique.length === 0) return []
  const res = await cloud.getTempFileURL({ fileList: unique })
  const map = new Map()
  for (const file of res.fileList || []) {
    if (file.status === 0 && file.fileID) {
      map.set(file.fileID, file.tempFileURL)
    }
  }
  return unique.map((id) => map.get(id)).filter(Boolean)
}

module.exports = {
  resolveImageUrl,
  resolveImageUrls,
}
