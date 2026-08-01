/** 微信云开发环境 ID */
export const CLOUD_ENV_ID =
  process.env.TARO_APP_CLOUD_ENV || 'cloudbase-d6gkz1xlx9adbfe51'

/** 云存储临时链接有效期（秒）。微信侧上限 86400；取 4 小时以缩小直链外泄的风险窗口 */
export const CLOUD_TEMP_URL_MAX_AGE_S = 4 * 3600

/** 本地缓存复用临时链接的时长，留 10% 安全边界避免踩在过期边界上 */
export const CLOUD_TEMP_URL_TTL_MS = CLOUD_TEMP_URL_MAX_AGE_S * 1000 * 0.9
