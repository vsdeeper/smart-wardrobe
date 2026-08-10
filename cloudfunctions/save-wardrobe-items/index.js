const cloud = require('wx-server-sdk')
const { saveRecognizedItem } = require('./utils/wardrobe-save')
const { normalizeItemInput } = require('./utils/normalize-item-input')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

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
