const cloud = require('wx-server-sdk')
const {
  buildRecommendSystemPrompt,
  buildRecommendUserPrompt,
  parseRecommendResult,
  buildFallbackRecommendation,
  buildSelectionFallbackRecommendation,
  isSelectionRecommendationValid,
} = require('./common/recommendOutfitRules')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
const DEFAULT_TEMPERATURE = 0.3

function resolveSeedTemperature() {
  const raw = process.env.DOUBAO_SEED_TEMPERATURE
  const parsed = raw === undefined || raw === '' ? DEFAULT_TEMPERATURE : parseFloat(raw)
  if (Number.isNaN(parsed)) return DEFAULT_TEMPERATURE
  return Math.min(2, Math.max(0, parsed))
}

async function callSeedChat(systemPrompt, userPrompt) {
  const apiKey = process.env.DOUBAO_API_KEY
  const baseUrl = process.env.DOUBAO_API_BASE_URL || DEFAULT_BASE_URL
  const model = process.env.DOUBAO_SEED_MODEL
  if (!apiKey) throw new Error('未配置 DOUBAO_API_KEY')
  if (!model) throw new Error('未配置 DOUBAO_SEED_MODEL')

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: resolveSeedTemperature(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || `HTTP ${res.status}`)
  }
  return data?.choices?.[0]?.message?.content ?? ''
}

function summarizeWardrobe(wardrobeByType) {
  const result = {}
  for (const [typeName, items] of Object.entries(wardrobeByType || {})) {
    if (!Array.isArray(items)) continue
    result[typeName] = items.map((item) => ({
      id: String(item.id ?? item._id ?? ''),
      name: String(item.name ?? ''),
      tags: Array.isArray(item.tags) ? item.tags : [],
      stylingAdvice: typeof item.stylingAdvice === 'string' ? item.stylingAdvice : '',
    })).filter((item) => item.id)
  }
  return result
}

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
      weather: weather || { temperature: 20, humidity: 50, conditionCode: 'sunny', city: '当前位置' },
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
