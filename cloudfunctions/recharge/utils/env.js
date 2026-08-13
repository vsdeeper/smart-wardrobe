function readEnv(name) {
  const raw = process.env[name]
  if (raw == null) return undefined
  const trimmed = String(raw).trim()
  return trimmed === '' ? undefined : trimmed
}

/** 读取环境变量，缺失或空字符串时抛错 */
function requireEnv(name, hint) {
  const value = readEnv(name)
  if (!value) {
    const suffix = hint ? `，${hint}` : ''
    throw new Error(`[env] 缺少必需环境变量 ${name}${suffix}`)
  }
  return value
}

/** 读取环境变量，缺失或空字符串时返回 undefined */
function getEnv(name) {
  return readEnv(name)
}

module.exports = { requireEnv, getEnv }
