type EnvName = keyof NodeJS.ProcessEnv

function readEnv(name: EnvName): string | undefined {
  const raw = process.env[name]
  if (raw == null) return undefined
  const trimmed = raw.trim()
  return trimmed === '' ? undefined : trimmed
}

/** 读取环境变量，缺失或空字符串时抛错 */
export function requireEnv(name: EnvName, hint?: string): string {
  const value = readEnv(name)
  if (!value) {
    const suffix = hint ? `，${hint}` : ''
    throw new Error(`[env] 缺少必需环境变量 ${name}${suffix}`)
  }
  return value
}

/** 读取环境变量，缺失或空字符串时返回 undefined */
export function getEnv(name: EnvName): string | undefined {
  return readEnv(name)
}
