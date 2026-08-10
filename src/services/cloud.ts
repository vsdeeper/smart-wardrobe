import Taro from '@tarojs/taro'
import { CLOUD_ENV_ID } from '@/constants/cloud'
import { isWeapp } from '@/utils/platform'

let initialized = false

/** 初始化微信云开发（仅 weapp 平台，全局幂等） */
export function initCloud(): void {
  if (initialized || !isWeapp()) {
    return
  }
  Taro.cloud.init({
    env: CLOUD_ENV_ID,
    traceUser: true,
  })
  initialized = true
}
