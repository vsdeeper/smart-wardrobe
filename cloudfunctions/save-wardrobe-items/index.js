const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { saveRecognizedItem } = require('./common/wardrobeSave')

function normalizeItemInput(raw) {
  if (!raw || typeof raw !== 'object') return null

  const imageFileId = String(raw.imageFileId ?? '').trim()
  const name = String(raw.name ?? '').trim()
  const typeName = String(raw.typeName ?? '').trim()
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((tag) => String(tag ?? '').trim()).filter(Boolean)
    : []

  if (!name || !typeName || !imageFileId) return null

  let warmthLevel
  if (raw.warmthLevel !== undefined && raw.warmthLevel !== null) {
    const level = parseInt(String(raw.warmthLevel), 10)
    if (!Number.isNaN(level)) {
      warmthLevel = Math.min(5, Math.max(1, level))
    }
  }

  const result = { name, typeName, imageFileId, tags }
  if (warmthLevel !== undefined) {
    result.warmthLevel = warmthLevel
  }
  return result
}

exports.main = async (event) => {
  const { items } = event || {}

  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'INVALID_ITEMS', message: '缺少待入库衣物数据' }
  }

  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { error: 'NO_OPENID', message: '无法获取用户身份' }
  }

  const saved = []
  const failed = []

  for (let i = 0; i < items.length; i++) {
    const input = normalizeItemInput(items[i])
    if (!input) {
      failed.push({ index: i, message: '数据格式无效' })
      continue
    }

    try {
      const result = await saveRecognizedItem(openid, input.imageFileId, input)
      saved.push(result.item)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      failed.push({ index: i, message })
    }
  }

  return { saved, failed }
}
