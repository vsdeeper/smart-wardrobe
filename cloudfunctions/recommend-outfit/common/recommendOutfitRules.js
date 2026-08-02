function buildRecommendSystemPrompt(mode = 'recommend') {
  const selectionRule =
    mode === 'selection'
      ? `
指定单品评价模式：
- 用户已决定穿着所提供的全部单品，你只能评价这套搭配，不得新增、删除、替换或重新选择单品
- slots 必须逐一包含输入中的每件单品，typeName 与 selectedId 必须原样对应，alternatives 必须为空数组
- description 是「AI 评价」正文，应客观评价已选单品在色彩、材质、层次与场景上的表现，不得声称替用户推荐了其他单品`
      : ''

  return `你是专业穿搭顾问。根据用户天气、季节、职业与风格偏好，从用户衣橱中组成一套可实际同穿的合理搭配。

规则：
1. slots 只包含本次会一起穿着的单品，不要求覆盖衣橱全部类别（通常 2–5 件）
2. 每个 slot 的 selectedId 必须来自对应 typeName 下的衣橱 id
3. alternatives 为同类别其他候选 id（0–3 个），不得重复 selectedId
4. outfitName 为 4–8 字中文意境短名，体现天气/场景与材质或廓形（如「晴日亚麻层叠」）；禁止「今日推荐」「清爽搭配」等空泛名
5. tips 为不超过 6 个风格标签：label 为无 emoji 的短词且不超过 4 个字（如「清爽」「自然」「舒适」）；禁止天气预警类文案（如「高紫外线」「注意防晒」）
6. description 为「AI 搭配建议」正文：一句约 20–40 字，说明材质、色彩或体感为何适合当前天气/场景（如「亚麻材质透气亲肤，浅色系在阳光下更显轻盈。」）；须与 slots 实际选品一致，勿描述未选入 slots 的单品，勿带「AI 搭配建议：」前缀，勿罗列单品清单
7. 若单品带 advice 字段（该单品自身的穿搭建议），组合搭配与撰写 description 时应优先参考，但仍须遵守以上搭配常识与规则，不得为迁就 advice 而破坏整体合理性
8. 只返回 JSON，无其他文字
${selectionRule}

搭配常识（请自主判断，勿为凑齐类别而混搭互斥单品）：
- 连衣裙/连体类：通常单穿，不与上装、下装同时出现
- 分体穿搭：上装 + 下装
- 外套：可选叠穿，叠于上装或连衣裙之上
- 鞋靴、配饰：按需补充，非必须

格式：
{
  "outfitName": "晴日亚麻层叠",
  "description": "亚麻材质透气亲肤，浅色系在阳光下更显轻盈。",
  "slots": [
    { "typeName": "上装", "selectedId": "id", "alternatives": ["id2"] }
  ],
  "tips": [
    { "label": "清爽" },
    { "label": "自然" },
    { "label": "舒适" }
  ]
}`
}

function buildRecommendUserPrompt(payload) {
  const { weather, season, profile, wardrobeByType, mode = 'recommend' } = payload

  const wardrobeText = Object.entries(wardrobeByType || {})
    .map(([typeName, items]) => {
      const lines = (items || []).map((item) => {
        const adviceText = item.stylingAdvice ? ` advice:${item.stylingAdvice}` : ''
        return `  - id:${item.id} name:${item.name} tags:${JSON.stringify(item.tags || [])}${adviceText}`
      })
      return `${typeName}:\n${lines.join('\n')}`
    })
    .join('\n\n')

  const instruction =
    mode === 'selection'
      ? '请评价用户已选择的这套穿搭。slots 必须包含下方全部单品且不得增删替换，alternatives 均为空数组；重点生成准确的搭配名称、评价正文和风格标签。'
      : '请推荐今日穿搭。只选会一起穿着的单品写入 slots（通常 2–5 件），勿为凑齐类别而混搭互斥单品（如连衣裙与上装/下装不可同穿）。优先保证主体穿搭合理，再考虑鞋靴与外套。'

  return `当前季节：${season}
天气：${weather.conditionCode} ${weather.temperature}°C 湿度${weather.humidity}% 城市${weather.city}
用户：身高${profile.heightCm}cm 体重${profile.weightKg}kg 职业「${profile.occupation || '未填写'}」 风格标签 ${JSON.stringify(profile.styleTags || [])}

${mode === 'selection' ? '用户已选单品' : '衣橱单品'}（按类别）：
${wardrobeText}

${instruction}`
}

function parseRecommendResult(content) {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 返回格式无效')
  const parsed = JSON.parse(jsonMatch[0])

  const outfitName = String(parsed.outfitName ?? '').trim()
  const description = String(parsed.description ?? '').trim()

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
    ? parsed.tips
        .map((tip, index) => ({
          id: index + 1,
          label: String(tip.label ?? '').trim(),
        }))
        .filter((t) => t.label)
    : []

  if (!outfitName || slots.length === 0) {
    throw new Error('AI 返回缺少必要字段')
  }

  if ([...outfitName].length > 8) {
    throw new Error('试穿名称不能超过 8 个字')
  }

  if (tips.length > 6) {
    throw new Error('风格标签不能超过 6 个')
  }
  if (tips.some((t) => [...t.label].length > 4)) {
    throw new Error('风格标签不能超过 4 个字')
  }

  return { outfitName, description, slots, tips }
}

function buildSlotFromItems(typeName, items) {
  if (!items || items.length === 0) return null
  const selected = items[0]
  return {
    typeName,
    selectedId: selected.id,
    alternatives: items.slice(1, 4).map((i) => i.id),
  }
}

/** 衣橱为空或 LLM 失败时的规则降级推荐 */
function buildFallbackRecommendation(wardrobeByType, season, weather) {
  const byType = wardrobeByType || {}
  const getItems = (typeName) => byType[typeName] || []
  const slots = []

  const dressItems = getItems('连衣裙')
  if (dressItems.length > 0) {
    const slot = buildSlotFromItems('连衣裙', dressItems)
    if (slot) slots.push(slot)
  } else {
    const topSlot = buildSlotFromItems('上装', getItems('上装'))
    const bottomSlot = buildSlotFromItems('下装', getItems('下装'))
    if (topSlot) slots.push(topSlot)
    if (bottomSlot) slots.push(bottomSlot)
  }

  if (slots.length === 0) {
    for (const [typeName, items] of Object.entries(byType)) {
      const slot = buildSlotFromItems(typeName, items)
      if (slot) {
        slots.push(slot)
        break
      }
    }
  }

  if (slots.length === 0) {
    return null
  }

  const temp = weather?.temperature ?? 20
  const needsOuter = temp < 18
  if (needsOuter) {
    const outerSlot = buildSlotFromItems('外套', getItems('外套'))
    if (outerSlot) slots.push(outerSlot)
  }

  const shoeSlot = buildSlotFromItems('鞋靴', getItems('鞋靴'))
  if (shoeSlot) slots.push(shoeSlot)

  const tips =
    temp >= 28
      ? [
          { id: 1, label: '清爽' },
          { id: 2, label: '轻盈' },
          { id: 3, label: '舒适' },
        ]
      : temp < 18
        ? [
            { id: 1, label: '温暖' },
            { id: 2, label: '层叠' },
            { id: 3, label: '得体' },
          ]
        : [
            { id: 1, label: '自然' },
            { id: 2, label: '舒适' },
            { id: 3, label: '随性' },
          ]

  const outfitName =
    temp >= 28 ? '晴日轻盈层叠' : temp < 18 ? '微凉温暖层叠' : `${season}日自在穿搭`
  const description =
    temp >= 28
      ? '轻薄透气面料更宜出行，浅色系在阳光下更显清爽。'
      : temp < 18
        ? '适度叠穿兼顾保暖与层次，触感亲肤更显从容。'
        : `结合${season}季气温选材，体感舒适且便于日常活动。`

  return {
    outfitName,
    description,
    slots,
    tips,
  }
}

function buildSelectionFallbackRecommendation(wardrobeByType, season, weather) {
  const slots = Object.entries(wardrobeByType || {}).flatMap(([typeName, items]) =>
    (items || []).map((item) => ({
      typeName,
      selectedId: item.id,
      alternatives: [],
    })),
  )
  if (slots.length === 0) return null

  const temp = weather?.temperature ?? 20
  const tips =
    temp >= 28
      ? ['清爽', '轻盈', '个性']
      : temp < 18
        ? ['层次', '温暖', '个性']
        : ['自然', '舒适', '个性']

  return {
    outfitName: `${season}日个性穿搭`,
    description: '所选单品共同形成鲜明的个人表达，色彩与层次可结合当日场景灵活呈现。',
    slots,
    tips: tips.map((label, index) => ({ id: index + 1, label })),
  }
}

function isSelectionRecommendationValid(recommendation, wardrobeByType) {
  const expected = Object.entries(wardrobeByType || {}).flatMap(([typeName, items]) =>
    (items || []).map((item) => `${typeName}:${item.id}`),
  )
  const actual = (recommendation?.slots || []).map(
    (slot) => `${slot.typeName}:${slot.selectedId}`,
  )
  return (
    expected.length > 0 &&
    expected.length === actual.length &&
    new Set(expected).size === expected.length &&
    expected.every((key) => actual.includes(key)) &&
    recommendation.slots.every(
      (slot) => Array.isArray(slot.alternatives) && slot.alternatives.length === 0,
    )
  )
}

module.exports = {
  buildRecommendSystemPrompt,
  buildRecommendUserPrompt,
  parseRecommendResult,
  buildFallbackRecommendation,
  buildSelectionFallbackRecommendation,
  isSelectionRecommendationValid,
}
