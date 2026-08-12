const cloud = require('wx-server-sdk')
const {
  getBalanceSummary,
  release,
  ERROR_INSUFFICIENT,
} = require('./utils/credits')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 积分云函数：查询余额、释放试穿预占（缓存命中跳过出图时调用）。
 */
exports.main = async (event) => {
  const { action, creditHoldId } = event || {}

  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    if (!openid) {
      return { error: 'NO_OPENID', message: '无法获取用户身份' }
    }

    if (action === 'balance') {
      const summary = await getBalanceSummary(db, openid)
      return summary
    }

    if (action === 'releaseHold') {
      if (!creditHoldId || typeof creditHoldId !== 'string') {
        return { error: 'INVALID_HOLD', message: '缺少 creditHoldId' }
      }
      await release(db, openid, creditHoldId)
      return { ok: true }
    }

    return { error: 'INVALID_ACTION', message: '不支持的操作' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (err?.error === ERROR_INSUFFICIENT) {
      return { error: ERROR_INSUFFICIENT, message }
    }
    return { error: 'CREDITS_FAILED', message }
  }
}
