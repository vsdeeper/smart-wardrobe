const cloud = require('wx-server-sdk')
const { fulfillOrder } = require('./utils/recharge-order')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/** 微信支付成功结果码 */
const PAY_SUCCESS = 'SUCCESS'

/**
 * 微信支付结果通知云函数（由 cloudPay 回调触发，非小程序 callFunction）。
 * 入账幂等：重复通知不会重复加积分。
 */
exports.main = async (event) => {
  console.log('[pay-callback] event:', JSON.stringify(event))

  try {
    const returnCode = event.returnCode || event.return_code
    const resultCode = event.resultCode || event.result_code
    const outTradeNo = event.outTradeNo || event.out_trade_no

    if (returnCode !== PAY_SUCCESS || resultCode !== PAY_SUCCESS) {
      return { errcode: 0, errmsg: 'ignored' }
    }

    if (!outTradeNo) {
      console.warn('[pay-callback] missing outTradeNo')
      return { errcode: 0, errmsg: 'missing outTradeNo' }
    }

    const totalFee =
      typeof event.totalFee === 'number'
        ? event.totalFee
        : typeof event.total_fee === 'number'
          ? event.total_fee
          : undefined
    const transactionId =
      event.transactionId || event.transaction_id || ''

    await fulfillOrder(db, outTradeNo, { totalFee, transactionId })
    return { errcode: 0, errmsg: 'ok' }
  } catch (err) {
    console.error('[pay-callback]', err)
    // 返回非 0 可能触发微信重试；业务已幂等时可仍返回 0
    return { errcode: 0, errmsg: 'processed with error logged' }
  }
}
