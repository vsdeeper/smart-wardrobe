import Taro from '@tarojs/taro'
import { CLOUD_ENV_ID } from '@/config/cloud'
import { getEnv } from '@/utils/env'

let initialized = false

/** 初始化微信云开发（仅 weapp 平台，全局幂等） */
export function initCloud(): void {
  if (initialized || getEnv('TARO_ENV') !== 'weapp') {
    return
  }
  Taro.cloud.init({
    env: CLOUD_ENV_ID,
    traceUser: true,
  })
  initialized = true
}
