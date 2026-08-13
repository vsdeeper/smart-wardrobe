async function uploadBase64ToCloud(cloud, base64Data, cloudPath) {
  const raw = String(base64Data ?? '').trim()
  const match = raw.match(/^data:image\/(\w+);base64,(.+)$/)
  const ext = match ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'png'
  const base64Body = match ? match[2] : raw
  const buffer = Buffer.from(base64Body, 'base64')
  const path = cloudPath || `generated/${Date.now()}.${ext}`
  const uploadRes = await cloud.uploadFile({
    cloudPath: path,
    fileContent: buffer,
  })
  return uploadRes.fileID
}

async function uploadUrlToCloud(cloud, imageUrl, cloudPath) {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`下载生成图失败 HTTP ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'image/png'
  const ext =
    contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png'
  const path = cloudPath || `generated/${Date.now()}.${ext}`
  const uploadRes = await cloud.uploadFile({
    cloudPath: path,
    fileContent: buffer,
  })
  return uploadRes.fileID
}

function buildCloudPath(prefix, openid, index) {
  const suffix =
    index === undefined || index === null ? `${Date.now()}` : `${Date.now()}-${index}`
  return `${prefix}/${openid}/${suffix}`
}

async function uploadGeneratedImageToCloud(cloud, imageResult, options = {}) {
  const { prefix = 'generated', openid, index } = options
  const cloudPath = buildCloudPath(prefix, openid, index)

  if (imageResult.b64) {
    const b64Value = imageResult.b64.startsWith('data:')
      ? imageResult.b64
      : `data:image/png;base64,${imageResult.b64}`
    const extMatch = b64Value.match(/^data:image\/(\w+);base64,/)
    const ext = extMatch && extMatch[1] === 'jpeg' ? 'jpg' : extMatch?.[1] || 'png'
    const fullPath = `${cloudPath}.${ext}`
    return uploadBase64ToCloud(cloud, b64Value, fullPath)
  }
  if (imageResult.url) {
    const fullPath = `${cloudPath}.png`
    return uploadUrlToCloud(cloud, imageResult.url, fullPath)
  }
  return null
}

module.exports = {
  uploadBase64ToCloud,
  uploadUrlToCloud,
  uploadGeneratedImageToCloud,
  buildCloudPath,
}
