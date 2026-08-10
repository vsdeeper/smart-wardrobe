const cloud = require('wx-server-sdk')
const {
  buildRecommendSystemPrompt,
  buildRecommendUserPrompt,
  parseRecommendResult,
  buildFallbackRecommendation,
  buildSelectionFallbackRecommendation,
  isSelectionRecommendationValid,
} = require('./constants/recommend-outfit-rules')
const { callSeedChat } = require('./utils/call-seed-chat')
const { summarizeWardrobe } = require('./utils/summarize-wardrobe')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { mode = 'recommend', weather, season, profile, wardrobeByType } = event || {}
  const requestMode = mode === 'selection' ? 'selection' : 'recommend'

  try {
    const wxContext = cloud.getWXContext()
    if (!wxContext.OPENID) {
      return { error: 'NO_OPENID', message: '无法获取用户身份' }
    }

    const summarized = summarizeWardrobe(wardrobeByType)
    const typeCount = Object.values(summarized).filter((arr) => arr.length > 0).length

    if (typeCount === 0) {
      return { error: 'EMPTY_WARDROBE', message: '衣橱为空，请先上传衣物' }
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
    }

    let recommendation
    try {
      const content = await callSeedChat(
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
    } catch (llmErr) {
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
        throw llmErr
      }
    }

    return { recommendation }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: 'RECOMMEND_FAILED', message }
  }
}
