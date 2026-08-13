const cloud = require('wx-server-sdk')
const {
  createOrder,
  queryAndFulfill,
  ERROR_PAY_NOT_CONFIGURED,
} = require('./utils/recharge-order')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 积分充值云函数：创建订单、查单补单。
 * action: createOrder | queryOrder
 */
exports.main = async (event) => {
  const { action, amountFen, outTradeNo } = event || {}

  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    if (!openid) {
      return { error: 'NO_OPENID', message: '无法获取用户身份' }
    }

    if (action === 'createOrder') {
      const result = await createOrder(db, cloud, openid, amountFen)
      return result
    }

    if (action === 'queryOrder') {
      const result = await queryAndFulfill(db, cloud, openid, outTradeNo)
      return result
    }

    return { error: 'INVALID_ACTION', message: '不支持的操作' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (err?.error) {
      return { error: err.error, message }
    }
    if (err?.error === ERROR_PAY_NOT_CONFIGURED) {
      return { error: ERROR_PAY_NOT_CONFIGURED, message }
    }
    console.error('[recharge]', err)
    return { error: 'RECHARGE_FAILED', message }
  }
}
