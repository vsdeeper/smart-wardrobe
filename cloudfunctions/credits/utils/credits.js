const {
  INITIAL_GRANT,
  ERROR_INSUFFICIENT,
  COLLECTION_USER_CREDITS,
  COLLECTION_CREDIT_HOLDS,
  COLLECTION_CREDIT_LEDGER,
} = require('../constants/credits')

/**
 * 计算可用积分（余额减冻结）。
 * @param {{ balance?: number, frozen?: number }} account
 */
function getAvailable(account) {
  const balance = typeof account?.balance === 'number' ? account.balance : 0
  const frozen = typeof account?.frozen === 'number' ? account.frozen : 0
  return balance - frozen
}

/**
 * 写入积分流水，便于客服核对。
 */
async function appendLedger(db, openid, entry) {
  await db.collection(COLLECTION_CREDIT_LEDGER).add({
    data: {
      _openid: openid,
      type: entry.type,
      amount: entry.amount,
      action: entry.action || '',
      refId: entry.refId || '',
      holdId: entry.holdId || '',
      note: entry.note || '',
      createdAt: Date.now(),
    },
  })
}

/**
 * 确保用户积分账户存在；首次创建时赠送 INITIAL_GRANT。
 * @returns {Promise<Record<string, unknown>>}
 */
async function ensureAccount(db, openid) {
  const col = db.collection(COLLECTION_USER_CREDITS)
  const existing = await col.where({ _openid: openid }).limit(1).get()
  if (existing.data.length > 0) {
    return existing.data[0]
  }

  const now = Date.now()
  try {
    await col.add({
      data: {
        _openid: openid,
        balance: INITIAL_GRANT,
        frozen: 0,
        initialGranted: true,
        updatedAt: now,
      },
    })
    await appendLedger(db, openid, {
      type: 'grant',
      amount: INITIAL_GRANT,
      note: 'initial',
    })
  } catch (err) {
    console.warn('[credits] ensureAccount add race:', err)
  }

  const created = await col.where({ _openid: openid }).limit(1).get()
  if (created.data.length === 0) {
    throw new Error('积分账户初始化失败')
  }
  return created.data[0]
}

/**
 * 读取账户可用积分；不足时抛出带 error 字段的对象。
 */
async function requireAvailable(db, openid, amount) {
  const account = await ensureAccount(db, openid)
  const available = getAvailable(account)
  if (available < amount) {
    const err = new Error('积分不足，请查看积分说明')
    err.error = ERROR_INSUFFICIENT
    throw err
  }
  return account
}

/**
 * 乐观锁更新 user_credits，避免并发预占穿透。
 */
async function updateAccountWithLock(db, openid, account, patch) {
  const _ = db.command
  const balance =
    typeof account.balance === 'number' ? account.balance : 0
  const frozen = typeof account.frozen === 'number' ? account.frozen : 0
  const res = await db
    .collection(COLLECTION_USER_CREDITS)
    .where({ _openid: openid, balance, frozen })
    .update({
      data: {
        ...patch,
        updatedAt: Date.now(),
      },
    })

  if (!res.stats || res.stats.updated === 0) {
    throw new Error('积分账户更新冲突，请重试')
  }
}

/**
 * 预占积分：冻结 amount，写入 credit_holds。
 * @returns {Promise<{ holdId: string, amount: number }>}
 */
async function hold(db, openid, amount, action, refId = '') {
  if (!(amount > 0)) {
    throw new Error('预占积分必须大于 0')
  }

  let lastError = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const account = await requireAvailable(db, openid, amount)
      const frozen =
        typeof account.frozen === 'number' ? account.frozen : 0
      await updateAccountWithLock(db, openid, account, {
        frozen: frozen + amount,
      })

      const holdRes = await db.collection(COLLECTION_CREDIT_HOLDS).add({
        data: {
          _openid: openid,
          amount,
          settledAmount: 0,
          action,
          refId,
          status: 'held',
          createdAt: Date.now(),
        },
      })

      await appendLedger(db, openid, {
        type: 'hold',
        amount,
        action,
        refId,
        holdId: holdRes._id,
      })

      return { holdId: holdRes._id, amount }
    } catch (err) {
      lastError = err
      if (err?.error === ERROR_INSUFFICIENT) {
        throw err
      }
    }
  }

  throw lastError || new Error('积分预占失败')
}

/**
 * 读取并校验 hold 归属与状态。
 */
async function getHeldRecord(db, openid, holdId) {
  if (!holdId) {
    throw new Error('缺少 creditHoldId')
  }
  const docRes = await db.collection(COLLECTION_CREDIT_HOLDS).doc(holdId).get()
  const holdDoc = docRes.data
  if (!holdDoc || !holdDoc._id) {
    throw new Error('积分预占记录不存在')
  }
  if (holdDoc._openid !== openid) {
    throw new Error('无权操作该积分预占')
  }
  if (holdDoc.status !== 'held') {
    throw new Error('积分预占已处理')
  }
  return holdDoc
}

/**
 * 结算预占：实扣 settledAmount，释放整笔冻结。
 */
async function settle(db, openid, holdId, settledAmount) {
  const holdDoc = await getHeldRecord(db, openid, holdId)
  const holdAmount =
    typeof holdDoc.amount === 'number' ? holdDoc.amount : 0
  const charge =
    typeof settledAmount === 'number' ? settledAmount : holdAmount

  if (charge < 0 || charge > holdAmount) {
    throw new Error('结算积分超出预占范围')
  }

  let lastError = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const account = await ensureAccount(db, openid)
      const balance =
        typeof account.balance === 'number' ? account.balance : 0
      const frozen =
        typeof account.frozen === 'number' ? account.frozen : 0

      if (balance < charge) {
        const err = new Error('积分不足，请查看积分说明')
        err.error = ERROR_INSUFFICIENT
        throw err
      }
      if (frozen < holdAmount) {
        throw new Error('冻结积分异常')
      }

      await updateAccountWithLock(db, openid, account, {
        balance: balance - charge,
        frozen: frozen - holdAmount,
      })

      await db
        .collection(COLLECTION_CREDIT_HOLDS)
        .doc(holdId)
        .update({
          data: {
            status: 'settled',
            settledAmount: charge,
            settledAt: Date.now(),
          },
        })

      await appendLedger(db, openid, {
        type: 'settle',
        amount: charge,
        action: holdDoc.action || '',
        refId: holdDoc.refId || '',
        holdId,
      })

      return { settledAmount: charge }
    } catch (err) {
      lastError = err
      if (err?.error === ERROR_INSUFFICIENT) {
        throw err
      }
    }
  }

  throw lastError || new Error('积分结算失败')
}

/**
 * 释放预占：不扣余额，仅解冻。
 */
async function release(db, openid, holdId) {
  const holdDoc = await getHeldRecord(db, openid, holdId)
  const holdAmount =
    typeof holdDoc.amount === 'number' ? holdDoc.amount : 0

  let lastError = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const account = await ensureAccount(db, openid)
      const frozen =
        typeof account.frozen === 'number' ? account.frozen : 0
      if (frozen < holdAmount) {
        throw new Error('冻结积分异常')
      }

      await updateAccountWithLock(db, openid, account, {
        frozen: frozen - holdAmount,
      })

      await db
        .collection(COLLECTION_CREDIT_HOLDS)
        .doc(holdId)
        .update({
          data: {
            status: 'released',
            settledAmount: 0,
            releasedAt: Date.now(),
          },
        })

      await appendLedger(db, openid, {
        type: 'release',
        amount: holdAmount,
        action: holdDoc.action || '',
        refId: holdDoc.refId || '',
        holdId,
      })

      return { releasedAmount: holdAmount }
    } catch (err) {
      lastError = err
    }
  }

  throw lastError || new Error('积分解冻失败')
}

/**
 * 查询余额摘要。
 */
async function getBalanceSummary(db, openid) {
  const account = await ensureAccount(db, openid)
  const balance = typeof account.balance === 'number' ? account.balance : 0
  const frozen = typeof account.frozen === 'number' ? account.frozen : 0
  return {
    balance,
    frozen,
    available: balance - frozen,
    initialGranted: account.initialGranted === true,
  }
}

module.exports = {
  getAvailable,
  ensureAccount,
  requireAvailable,
  hold,
  settle,
  release,
  getBalanceSummary,
  ERROR_INSUFFICIENT,
}
