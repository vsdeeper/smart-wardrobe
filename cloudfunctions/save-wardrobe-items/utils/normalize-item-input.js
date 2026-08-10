function normalizeItemInput(raw) {
  if (!raw || typeof raw !== 'object') return null

  const imageFileId = String(raw.imageFileId ?? '').trim()
  const name = String(raw.name ?? '').trim()
  const typeName = String(raw.typeName ?? '').trim()
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((tag) => String(tag ?? '').trim()).filter(Boolean)
    : []
  const stylingAdvice = String(raw.stylingAdvice ?? '').trim()

  if (!name || !typeName || !imageFileId) return null

  return { name, typeName, imageFileId, tags, stylingAdvice }
}

module.exports = { normalizeItemInput }
