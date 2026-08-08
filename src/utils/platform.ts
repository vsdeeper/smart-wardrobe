import Taro from '@tarojs/taro'

/** 当前是否运行在微信小程序环境 */
export function isWeapp(): boolean {
  return Taro.getEnv() === Taro.ENV_TYPE.WEAPP
}
