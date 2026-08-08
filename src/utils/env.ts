type EnvName = keyof NodeJS.ProcessEnv

/** Taro 构建时内联的环境变量（须静态访问 process.env.XXX，勿用动态下标） */
const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  TARO_ENV: process.env.TARO_ENV,
  TARO_APP_ID: process.env.TARO_APP_ID,
  TARO_APP_CLOUD_ENV: process.env.TARO_APP_CLOUD_ENV,
} as const satisfies Record<EnvName, string | undefined>

function readEnv(name: EnvName): string | undefined {
  const raw = ENV[name]
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
