function normalizeItemInput(raw) {
  if (!raw || typeof raw !== 'object') return null

  const typeName = String(raw.typeName ?? '').trim()
  const name = String(raw.name ?? '').trim()
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((tag) => String(tag ?? '').trim()).filter(Boolean)
    : []
  const stylingAdvice = String(raw.stylingAdvice ?? '').trim()

  if (!typeName || !name) return null

  return { typeName, name, tags, stylingAdvice }
}

function normalizeItemsInput(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('缺少待生成展示图的单品列表')
  }
  const normalized = items.map(normalizeItemInput).filter(Boolean)
  if (normalized.length === 0) {
    throw new Error('单品数据格式无效')
  }
  return normalized
}

module.exports = { normalizeItemInput, normalizeItemsInput }
