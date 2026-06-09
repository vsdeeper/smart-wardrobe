const cloud = require('wx-server-sdk')
const { saveRecognizedItem } = require('../common/wardrobeSave')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const SYSTEM_PROMPT = `你是一个专业的衣物识别助手。根据用户上传的衣物照片，识别衣物类型和属性。
只返回 JSON，不要其他文字。格式：
{
  "typeName": "类型名，如 T恤、衬衫、毛衣、牛仔裤、短裤、连衣裙、大衣、运动鞋等",
  "name": "简短描述性名称，如 基础白色T恤",
  "tags": ["颜色", "材质或风格标签"]
}`

async function resolveImageUrl(fileID) {
  const res = await cloud.getTempFileURL({ fileList: [fileID] })
  const file = res.fileList?.[0]
  if (!file || file.status !== 0) {
    throw new Error('无法获取图片临时链接')
  }
  return file.tempFileURL
}

function parseRecognitionContent(content) {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI 返回格式无效')
  }
  const parsed = JSON.parse(jsonMatch[0])
  if (!parsed.typeName || !parsed.name) {
    throw new Error('AI 返回缺少必要字段')
  }
  return {
    typeName: String(parsed.typeName).trim(),
    name: String(parsed.name).trim(),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
  }
}

exports.main = async (event) => {
  const { fileID, persist = false } = event || {}

  if (!fileID || typeof fileID !== 'string') {
    return { error: 'INVALID_FILE_ID', message: '缺少 fileID' }
  }

  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { error: 'NO_OPENID', message: '无法获取用户身份' }
  }

  const apiKey = process.env.DOUBAO_API_KEY
  const baseUrl = process.env.DOUBAO_API_BASE_URL
  const model = process.env.DOUBAO_VISION_MODEL

  if (!apiKey) {
    return { error: 'PROVIDER_CONFIG', message: '未配置 DOUBAO_API_KEY 环境变量' }
  }
  if (!model) {
    return { error: 'PROVIDER_CONFIG', message: '未配置 DOUBAO_VISION_MODEL 环境变量' }
  }

  try {
    const imageUrl = await resolveImageUrl(fileID)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: '请识别这件衣物的类型、名称和标签。' },
            ],
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const errMsg = data?.error?.message || data?.message || `HTTP ${response.status}`
      return { error: 'LLM_API_ERROR', message: errMsg, model }
    }

    const content = data?.choices?.[0]?.message?.content ?? ''
    const recognized = parseRecognitionContent(content)

    if (persist === true) {
      const saved = await saveRecognizedItem(openid, fileID, recognized)
      return saved
    }

    return {
      preview: {
        name: recognized.name,
        typeName: recognized.typeName,
        tags: recognized.tags,
        imageFileId: fileID,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: 'RECOGNIZE_FAILED', message }
  }
}
