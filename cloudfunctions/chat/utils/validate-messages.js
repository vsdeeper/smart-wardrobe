function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'messages 必须为非空数组'
  }
  for (const msg of messages) {
    if (!msg || typeof msg.role !== 'string' || typeof msg.content !== 'string') {
      return 'messages 每项须包含 role、content 字符串字段'
    }
  }
  return null
}

module.exports = { validateMessages }
