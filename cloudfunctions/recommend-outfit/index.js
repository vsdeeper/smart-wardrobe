const cloud = require('wx-server-sdk')
const {
  buildRecommendSystemPrompt,
  buildRecommendUserPrompt,
  parseRecommendResult,
  buildFallbackRecommendation,
  buildSelectionFallbackRecommendation,
  isSelectionRecommendationValid,
} = require('./constants/recommend-outfit-rules')
const { callChat } = require('./utils/call-chat')
const { summarizeWardrobe } = require('./utils/summarize-wardrobe')
const { OUTFIT_BASE, OUTFIT_TOTAL, ERROR_INSUFFICIENT } = require('./constants/credits')
const {
  hold,
  settle,
  release,
  ERROR_INSUFFICIENT: CREDITS_INSUFFICIENT,
} = require('./utils/credits')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { mode = 'recommend', weather, season, profile, wardrobeByType, plannedWearDateKey } =
    event || {}
  const requestMode = mode === 'selection' ? 'selection' : 'recommend'
  let creditHoldId = null
  let openid = null

  try {
    const wxContext = cloud.getWXContext()
    openid = wxContext.OPENID
    if (!openid) {
      return { error: 'NO_OPENID', message: '无法获取用户身份' }
    }

    const summarized = summarizeWardrobe(wardrobeByType)
    const typeCount = Object.values(summarized).filter((arr) => arr.length > 0).length

    if (typeCount === 0) {
      return { error: 'EMPTY_WARDROBE', message: '衣橱为空，请先上传衣物' }
    }

    try {
      const held = await hold(
        db,
        openid,
        OUTFIT_TOTAL,
        'outfit_session',
        plannedWearDateKey || '',
      )
      creditHoldId = held.holdId
    } catch (holdErr) {
      const message =
        holdErr instanceof Error ? holdErr.message : '积分预占失败'
      if (holdErr?.error === CREDITS_INSUFFICIENT) {
        return { error: ERROR_INSUFFICIENT, message }
      }
      return { error: 'CREDITS_HOLD_FAILED', message }
    }

    const payload = {
      mode: requestMode,
      weather: weather || {
        temperature: 20,
        humidity: 50,
        conditionCode: 'sunny',
        city: '当前位置',
      },
      season: season || '春',
      profile: profile || { occupation: '', styleTags: [] },
      wardrobeByType: summarized,
      plannedWearDateKey,
    }

    let recommendation
    let apiCompleted = false
    let fallbackErr = null
    try {
      const content = await callChat(
        buildRecommendSystemPrompt(requestMode),
        buildRecommendUserPrompt(payload),
      )
      recommendation = parseRecommendResult(content)
      if (
        requestMode === 'selection' &&
        !isSelectionRecommendationValid(recommendation, summarized)
      ) {
        throw new Error('AI 返回的单品与用户选择不一致')
      }
      apiCompleted = true
    } catch (llmErr) {
      // 第三方 API 报错（HTTP/网络/缺配置）→ 未消耗 API；其余（200 已返回但不可用）→ 视为已完成
      apiCompleted = llmErr?.code !== 'LLM_API_ERROR'
      recommendation =
        requestMode === 'selection'
          ? buildSelectionFallbackRecommendation(
              summarized,
              payload.season,
              payload.weather,
            )
          : buildFallbackRecommendation(
              summarized,
              payload.season,
              payload.weather,
            )
      if (!recommendation) {
        fallbackErr = llmErr
      }
    }

    // 搭评结算：API 已完成 → 收搭评基础费；未完成（第三方 API 报错走 fallback）→ 释放
    if (apiCompleted) {
      await settle(db, openid, creditHoldId, OUTFIT_BASE)
    } else {
      await release(db, openid, creditHoldId)
    }
    creditHoldId = null

    if (fallbackErr) {
      throw fallbackErr
    }

    return { recommendation }
  } catch (err) {
    if (openid && creditHoldId) {
      try {
        await release(db, openid, creditHoldId)
      } catch (releaseErr) {
        console.warn(
          '[recommend-outfit] 积分释放失败:',
          releaseErr instanceof Error ? releaseErr.message : releaseErr,
        )
      }
    }

    const message = err instanceof Error ? err.message : String(err)
    return { error: 'RECOMMEND_FAILED', message }
  }
}
