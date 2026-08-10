function summarizeWardrobe(wardrobeByType) {
  const result = {}
  for (const [typeName, items] of Object.entries(wardrobeByType || {})) {
    if (!Array.isArray(items)) continue
    result[typeName] = items
      .map((item) => ({
        id: String(item.id ?? item._id ?? ''),
        name: String(item.name ?? ''),
        tags: Array.isArray(item.tags) ? item.tags : [],
        stylingAdvice:
          typeof item.stylingAdvice === 'string' ? item.stylingAdvice : '',
      }))
      .filter((item) => item.id)
  }
  return result
}

module.exports = { summarizeWardrobe }
