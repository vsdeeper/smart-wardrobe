const cloud = require('wx-server-sdk')
const {
  resolveImageUrls,
  chatCompletions,
} = require('../common/doubaoVision')
const {
  buildTryonSystemPrompt,
  buildTryonUserPrompt,
  extractImageFromContent,
} = require('../common/tryonImageRules')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

async function uploadBase64ToCloud(base64Data, openid) {
  const match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!match) throw new Error('无效 base64 图片')
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
  const buffer = Buffer.from(match[2], 'base64')
  const cloudPath = `tryon/${openid}/${Date.now()}.${ext}`
  const uploadRes = await cloud.uploadFile({
    cloudPath,
    fileContent: buffer,
  })
  return uploadRes.fileID
}

exports.main = async (event) => {
  const {
    imageFileIds = [],
    heightCm = 170,
    weightKg = 60,
    outfitName = '今日搭配',
    description = '',
  } = event || {}

  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    if (!openid) {
      return { error: 'NO_OPENID', message: '无法获取用户身份' }
    }

    const fileIds = imageFileIds.filter(Boolean)
    if (fileIds.length === 0) {
      return { error: 'NO_IMAGES', message: '缺少衣物图片' }
    }

    const imageUrls = await resolveImageUrls(cloud, fileIds)

    if (imageUrls.length === 0) {
      return {
        error: 'FALLBACK_COLLAGE',
        message: '无法解析图片',
        coverFileId: fileIds[0],
      }
    }

    const userContent = [
      ...imageUrls.map((url) => ({
        type: 'image_url',
        image_url: { url },
      })),
      {
        type: 'text',
        text: buildTryonUserPrompt({ heightCm, weightKg, outfitName, description }),
      },
    ]

    let coverFileId = fileIds[0]
    let coverUrl = imageUrls[0]

    try {
      const content = await chatCompletions({
        messages: [
          { role: 'system', content: buildTryonSystemPrompt() },
          { role: 'user', content: userContent },
        ],
        temperature: 0.4,
      })

      const extracted = extractImageFromContent(content)
      if (extracted?.type === 'url') {
        coverUrl = extracted.value
      } else if (extracted?.type === 'base64') {
        coverFileId = await uploadBase64ToCloud(extracted.value, openid)
        const [resolved] = await resolveImageUrls(cloud, [coverFileId])
        if (resolved) coverUrl = resolved
      }
    } catch {
      return {
        coverFileId,
        coverUrl,
        fallback: true,
      }
    }

    return { coverFileId, coverUrl, fallback: coverFileId === fileIds[0] }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: 'GENERATE_FAILED', message }
  }
}
