const WORK_SCENE_LABELS = {
  office: '办公室',
  'client-meeting': '客户会面',
  field: '外勤',
  casual: '休闲日常',
  social: '社交活动',
}

function buildRecommendSystemPrompt() {
  return `你是专业穿搭顾问。根据用户天气、季节、职业与工作场景，从用户衣橱中为每个类别挑选最合适的单品组合。

规则：
1. 每个 slot 的 selectedId 必须来自对应 typeName 下的衣橱 id
2. alternatives 为同类别其他候选 id（0–3 个），不得重复 selectedId
3. matchScore 为 0–100 整数
4. tips 为 2–4 条穿搭提示，含 emoji icon
5. 考虑温度与 warmthLevel（1 极薄 → 5 极厚）匹配
6. 只返回 JSON，无其他文字

格式：
{
  "outfitName": "搭配名称",
  "description": "场景化描述",
  "matchScore": 95,
  "slots": [
    { "typeName": "上装", "selectedId": "id", "alternatives": ["id2"] }
  ],
  "tips": [{ "icon": "☀️", "label": "高紫外线" }]
}`
}

function buildRecommendUserPrompt(payload) {
  const { weather, season, profile, wardrobeByType } = payload
  const scenes = (profile.workScenes || [])
    .map((s) => WORK_SCENE_LABELS[s] || s)
    .join('、')

  const wardrobeText = Object.entries(wardrobeByType || {})
    .map(([typeName, items]) => {
      const lines = (items || []).map(
        (item) =>
          `  - id:${item.id} name:${item.name} tags:${JSON.stringify(item.tags || [])} warmth:${item.warmthLevel ?? '未知'}`,
      )
      return `${typeName}:\n${lines.join('\n')}`
    })
    .join('\n\n')

  return `当前季节：${season}
天气：${weather.conditionCode} ${weather.temperature}°C 湿度${weather.humidity}% 城市${weather.city}
用户：身高${profile.heightCm}cm 体重${profile.weightKg}kg 职业「${profile.occupation || '未填写'}」 场景「${scenes || '办公室'}」 风格标签 ${JSON.stringify(profile.styleTags || [])}

衣橱单品（按类别）：
${wardrobeText}

请推荐今日穿搭，slots 覆盖衣橱中有单品的类别，优先上装+下装+鞋靴（若有）。`
}

function parseRecommendResult(content) {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 返回格式无效')
  const parsed = JSON.parse(jsonMatch[0])

  const outfitName = String(parsed.outfitName ?? '').trim()
  const description = String(parsed.description ?? '').trim()
  const matchScore = Math.min(
    100,
    Math.max(0, parseInt(String(parsed.matchScore ?? 90), 10) || 90),
  )

  const slots = Array.isArray(parsed.slots)
    ? parsed.slots.map((slot, index) => ({
        typeName: String(slot.typeName ?? '').trim(),
        selectedId: String(slot.selectedId ?? '').trim(),
        alternatives: Array.isArray(slot.alternatives)
          ? slot.alternatives.map((id) => String(id).trim()).filter(Boolean)
          : [],
        _index: index,
      }))
    : []

  const tips = Array.isArray(parsed.tips)
    ? parsed.tips.map((tip, index) => ({
        id: index + 1,
        icon: String(tip.icon ?? '✨').trim(),
        label: String(tip.label ?? '').trim(),
      })).filter((t) => t.label)
    : []

  if (!outfitName || slots.length === 0) {
    throw new Error('AI 返回缺少必要字段')
  }

  return { outfitName, description, matchScore, slots, tips }
}

/** 衣橱为空或 LLM 失败时的规则降级推荐 */
function buildFallbackRecommendation(wardrobeByType, season, weather) {
  const slots = []
  const allIds = []

  for (const [typeName, items] of Object.entries(wardrobeByType || {})) {
    if (!items || items.length === 0) continue
    const selected = items[0]
    const alternatives = items.slice(1, 4).map((i) => i.id)
    slots.push({
      typeName,
      selectedId: selected.id,
      alternatives,
    })
    allIds.push(selected.id)
  }

  if (slots.length === 0) {
    return null
  }

  const temp = weather?.temperature ?? 20
  const tips = [
    { id: 1, icon: temp >= 28 ? '☀️' : '🌤️', label: temp >= 28 ? '注意防晒' : '舒适出行' },
    { id: 2, icon: '🍃', label: `${season}季搭配` },
  ]

  return {
    outfitName: '今日推荐',
    description: `根据${season}季与当前天气，为您搭配了 ${slots.length} 件单品。`,
    matchScore: 85,
    slots,
    tips,
  }
}

module.exports = {
  buildRecommendSystemPrompt,
  buildRecommendUserPrompt,
  parseRecommendResult,
  buildFallbackRecommendation,
}
