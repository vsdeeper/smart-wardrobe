import { requireEnv } from '@/utils/env'

/** 微信云开发环境 ID */
export const CLOUD_ENV_ID = requireEnv(
  'TARO_APP_CLOUD_ENV',
  '请在 .env.development 中配置',
)

/** 云存储临时链接有效期（秒）。对齐微信默认的 10 分钟，缩小直链外泄的风险窗口 */
export const CLOUD_TEMP_URL_MAX_AGE_S = 10 * 60

/** 本地缓存复用临时链接的时长，留 10% 安全边界避免踩在过期边界上 */
export const CLOUD_TEMP_URL_TTL_MS = CLOUD_TEMP_URL_MAX_AGE_S * 1000 * 0.9
