const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { code } = event || {}

  if (!code || typeof code !== 'string') {
    return { error: '缺少 code' }
  }

  try {
    const res = await cloud.openapi.phonenumber.getPhoneNumber({ code })
    const phoneNumber = res?.phoneInfo?.phoneNumber

    if (!phoneNumber) {
      return { error: '未获取到手机号' }
    }

    return { phoneNumber }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: message || '获取手机号失败' }
  }
}
