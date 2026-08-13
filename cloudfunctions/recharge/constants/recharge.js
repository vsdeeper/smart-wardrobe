/** 充值金额上下限（分）；1 积分 = ¥0.01，即 credits === amountFen */
const RECHARGE_MIN_FEN = 100
const RECHARGE_MAX_FEN = 20000

/** 微信支付未配置（个人商户未绑定） */
const ERROR_PAY_NOT_CONFIGURED = 'PAY_NOT_CONFIGURED'

/** 云函数环境变量：商户号，作为 unifiedOrder subMchId；未配置时不调微信 */
const ENV_WECHAT_PAY_MCH_ID = 'WECHAT_PAY_MCH_ID'

/** 支付回调云函数名 */
const PAY_CALLBACK_FUNCTION = 'pay-callback'

module.exports = {
  RECHARGE_MIN_FEN,
  RECHARGE_MAX_FEN,
  ERROR_PAY_NOT_CONFIGURED,
  ENV_WECHAT_PAY_MCH_ID,
  PAY_CALLBACK_FUNCTION,
}
