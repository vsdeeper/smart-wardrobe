const { getEnv } = require('./env')
const { addCredits } = require('./credits')
const {
  COLLECTION_CREDIT_ORDERS,
  COLLECTION_CREDIT_LEDGER,
  LEDGER_TYPE_RECHARGE,
} = require('../constants/credits')
const {
  RECHARGE_MIN_FEN,
  RECHARGE_MAX_FEN,
  ERROR_PAY_NOT_CONFIGURED,
  ENV_WECHAT_PAY_MCH_ID,
  PAY_CALLBACK_FUNCTION,
} = require('../constants/recharge')

/** 微信支付成功结果码 */
const PAY_SUCCESS = 'SUCCESS'

/**
 * 校验充值金额（分）并返回面值对应积分。
 * @returns {{ amountFen: number, credits: number }}
 */
function normalizeAmountFen(input) {
  const amountFen =
    typeof input === 'number' ? input : parseInt(String(input), 10)
  if (!Number.isInteger(amountFen) || amountFen <= 0) {
    const err = new Error('请输入有效充值金额')
    err.error = 'INVALID_AMOUNT'
    throw err
  }
  if (amountFen < RECHARGE_MIN_FEN || amountFen > RECHARGE_MAX_FEN) {
    const err = new Error(
      `充值金额须在 ¥${(RECHARGE_MIN_FEN / 100).toFixed(0)}–¥${(RECHARGE_MAX_FEN / 100).toFixed(0)} 之间`,
    )
    err.error = 'INVALID_AMOUNT'
    throw err
  }
  return { amountFen, credits: amountFen }
}

/**
 * 生成商户订单号（≤32 位字母数字）。
 */
function buildOutTradeNo(openid) {
  const suffix = openid ? openid.slice(-6).replace(/[^a-zA-Z0-9]/g, '0') : '0'
  const rand = Math.random().toString(36).slice(2, 8)
  const raw = `R${Date.now()}${suffix}${rand}`
  return raw.slice(0, 32)
}

/**
 * 读取订单；不存在时返回 null。
 */
async function getOrderByOutTradeNo(db, outTradeNo) {
  const res = await db
    .collection(COLLECTION_CREDIT_ORDERS)
    .where({ outTradeNo })
    .limit(1)
    .get()
  return res.data.length > 0 ? res.data[0] : null
}

/**
 * 是否已有该订单的 recharge 流水（幂等标记）。
 */
async function hasRechargeLedger(db, openid, outTradeNo) {
  const res = await db
    .collection(COLLECTION_CREDIT_LEDGER)
    .where({
      _openid: openid,
      type: LEDGER_TYPE_RECHARGE,
      refId: outTradeNo,
    })
    .limit(1)
    .get()
  return res.data.length > 0
}

/**
 * 支付成功幂等入账。
 * @param {object} options
 * @param {number} options.totalFee 回调/查单金额（分）
 * @param {string} [options.transactionId]
 */
async function fulfillOrder(db, outTradeNo, { totalFee, transactionId = '' }) {
  const order = await getOrderByOutTradeNo(db, outTradeNo)
  if (!order) {
    throw new Error('充值订单不存在')
  }

  const openid = order._openid
  if (!openid) {
    throw new Error('订单缺少用户身份')
  }

  const orderFee =
    typeof order.totalFee === 'number' ? order.totalFee : order.credits
  const paidFee = typeof totalFee === 'number' ? totalFee : orderFee

  if (paidFee !== orderFee) {
    const err = new Error('支付金额与订单不一致')
    err.error = 'AMOUNT_MISMATCH'
    throw err
  }

  if (order.status === 'paid') {
    const already = await hasRechargeLedger(db, openid, outTradeNo)
    if (already) {
      return {
        ok: true,
        outTradeNo,
        credits: order.credits,
        alreadyFulfilled: true,
      }
    }
  }

  if (order.status !== 'pending' && order.status !== 'paid') {
    throw new Error('订单状态不可入账')
  }

  const credits = typeof order.credits === 'number' ? order.credits : orderFee
  if (credits !== orderFee) {
    const err = new Error('订单积分与金额不一致')
    err.error = 'AMOUNT_MISMATCH'
    throw err
  }

  await addCredits(db, openid, credits, outTradeNo)

  await db
    .collection(COLLECTION_CREDIT_ORDERS)
    .doc(order._id)
    .update({
      data: {
        status: 'paid',
        transactionId: transactionId || order.transactionId || '',
        paidAt: Date.now(),
      },
    })

  return {
    ok: true,
    outTradeNo,
    credits,
    alreadyFulfilled: false,
  }
}

/**
 * 创建充值订单并调起云开发统一下单。
 */
async function createOrder(db, cloudInstance, openid, amountFenInput) {
  const { amountFen, credits } = normalizeAmountFen(amountFenInput)
  const mchId = getEnv(ENV_WECHAT_PAY_MCH_ID)

  if (!mchId) {
    const err = new Error('微信支付即将开放')
    err.error = ERROR_PAY_NOT_CONFIGURED
    throw err
  }

  const wxContext = cloudInstance.getWXContext()
  const envId = wxContext.ENV
  if (!envId) {
    throw new Error('无法获取云环境 ID')
  }

  const outTradeNo = buildOutTradeNo(openid)
  const now = Date.now()

  await db.collection(COLLECTION_CREDIT_ORDERS).add({
    data: {
      _openid: openid,
      outTradeNo,
      totalFee: amountFen,
      credits,
      status: 'pending',
      transactionId: '',
      createdAt: now,
      paidAt: null,
    },
  })

  let payResult
  try {
    payResult = await cloudInstance.cloudPay.unifiedOrder({
      body: '凡衣橱-积分充值',
      outTradeNo,
      spbillCreateIp: '127.0.0.1',
      subMchId: mchId,
      totalFee: amountFen,
      envId,
      functionName: PAY_CALLBACK_FUNCTION,
      tradeType: 'JSAPI',
    })
  } catch (err) {
    await db
      .collection(COLLECTION_CREDIT_ORDERS)
      .where({ outTradeNo })
      .update({
        data: { status: 'closed', closedAt: Date.now() },
      })
    throw err
  }

  if (!payResult || payResult.returnCode !== PAY_SUCCESS) {
    await db
      .collection(COLLECTION_CREDIT_ORDERS)
      .where({ outTradeNo })
      .update({
        data: { status: 'closed', closedAt: Date.now() },
      })
    const message =
      (payResult && payResult.returnMsg) || '微信支付下单失败'
    const err = new Error(message)
    err.error = 'UNIFIED_ORDER_FAILED'
    throw err
  }

  return {
    outTradeNo,
    credits,
    totalFee: amountFen,
    payment: payResult.payment,
  }
}

/**
 * 查单并补单入账（前端支付成功后调用）。
 */
async function queryAndFulfill(db, cloudInstance, openid, outTradeNo) {
  if (!outTradeNo || typeof outTradeNo !== 'string') {
    const err = new Error('缺少订单号')
    err.error = 'INVALID_ORDER'
    throw err
  }

  const order = await getOrderByOutTradeNo(db, outTradeNo)
  if (!order || order._openid !== openid) {
    const err = new Error('订单不存在或无权查看')
    err.error = 'ORDER_NOT_FOUND'
    throw err
  }

  if (order.status === 'paid') {
    const result = await fulfillOrder(db, outTradeNo, {
      totalFee: order.totalFee,
      transactionId: order.transactionId || '',
    })
    return {
      status: 'paid',
      credits: result.credits,
      alreadyFulfilled: result.alreadyFulfilled,
    }
  }

  const mchId = getEnv(ENV_WECHAT_PAY_MCH_ID)
  if (!mchId) {
    return { status: order.status, credits: order.credits }
  }

  const queryRes = await cloudInstance.cloudPay.queryOrder({
    outTradeNo,
    subMchId: mchId,
  })

  const tradeState = queryRes?.tradeState || queryRes?.trade_state
  const isPaid =
    tradeState === 'SUCCESS' ||
    queryRes?.returnCode === PAY_SUCCESS && queryRes?.resultCode === PAY_SUCCESS

  if (!isPaid) {
    return { status: order.status, credits: order.credits }
  }

  const totalFee =
    typeof queryRes.totalFee === 'number'
      ? queryRes.totalFee
      : typeof queryRes.total_fee === 'number'
        ? queryRes.total_fee
        : order.totalFee
  const transactionId =
    queryRes.transactionId || queryRes.transaction_id || ''

  const result = await fulfillOrder(db, outTradeNo, {
    totalFee,
    transactionId,
  })

  return {
    status: 'paid',
    credits: result.credits,
    alreadyFulfilled: result.alreadyFulfilled,
  }
}

module.exports = {
  normalizeAmountFen,
  buildOutTradeNo,
  fulfillOrder,
  createOrder,
  queryAndFulfill,
  ERROR_PAY_NOT_CONFIGURED,
}
