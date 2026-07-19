const HEAD_COMPOSITION_HINT =
  '人物水平居中，头顶与画面上边缘留白适中；头部完整入镜，头顶与面部清晰可见，不得裁切或遮挡头部'

/** 生活方式全身姿势（对齐试穿 Hero 参考构图） */
const SCENE_POSE_HINT =
  '姿势：全身站立，身体略侧向画面呈四分之三角度；一手自然插于裤袋（或裤侧），另一臂自然下垂；目光略侧向画面外，表情放松自然，生活感 lookbook 姿态（非正面垂臂证件照姿势）'

/** 始终全身构图（1:1 方形画幅） */
const SCENE_COMPOSITION_HINT = `构图：1:1 方形画幅，全身构图，从头顶到鞋尖完整入镜，人物水平居中，左右留白自然，清晰展示全部推荐单品与整体搭配，人物占画面主体大部分，勿裁成半身；${HEAD_COMPOSITION_HINT}`

const SCENE_BACKGROUND_BASE =
  '背景为简洁浅色纹理墙面（米白或浅灰）与中性地面，无杂物、无道具堆砌；画面中不得出现任何 UI、文字、水印或角标'

const GENDER_LABELS = {
  male: '男',
  female: '女',
}

const WEATHER_ATMOSPHERE = {
  sunny:
    '光影：明亮温暖的自然日光，墙面可有柔和树叶光斑与淡阴影，氛围清爽晴朗',
  cloudy: '光影：柔和漫射日光，色温偏中性，阴影轻柔，无强烈直射光',
  overcast: '光影：均匀柔和的阴天漫射光，色调略偏冷灰，对比度适中',
  rainy:
    '光影：偏冷湿润的柔光，墙面略暗、氛围清凉；仍为干燥墙面场景，勿堆砌积水或雨具道具',
  thunderstorm:
    '光影：偏冷戏剧感的柔光，墙面略暗；仍为简洁墙面场景，勿表现闪电或暴雨道具',
  snowy: '光影：清冷明亮的漫射光，高光柔和，氛围干净清爽',
  foggy: '光影：轻雾感低对比柔光，层次柔和，远近略有空气感',
  windy: '光影：明亮略清爽的侧光，阴影干净利落',
}

const TRYON_PROMPT_TEMPLATE = `你的任务是根据用户提供的衣物单品和人物特征信息，生成衣物试穿效果图。请仔细遵循以下步骤：

首先，接收并解析用户提供的衣物单品信息：
<clothing_items>
{{CLOTHING_ITEMS}}
</clothing_items>

接下来，接收并解析用户提供的人物特征信息：
<person_features>
{{PERSON_FEATURES}}
</person_features>

生成试穿效果图时，请遵守以下规则：
1. {{RULE_1}}
2. {{RULE_2}}
3. 确保衣物的款式、颜色、材质等细节与参考图及单品信息一致
4. {{RULE_4}}
5. {{RULE_5}}

最终输出要求：
- 仅输出试穿效果图的图片文件，不包含任何文字说明
- 画面中不得出现任何中文、英文、数字、标题、水印或 UI 排版文字
- 图片需达到高清质量，能够清晰展示衣物细节和穿着效果
- 确保图片格式符合常见的图像标准（如 JPG、PNG 等）

请直接生成并输出符合要求的试穿效果图。`

function clothingImageStartIndex(hasModelTemplate) {
  return hasModelTemplate ? 2 : 1
}

function buildWeatherAtmosphereHint(conditionCode) {
  const code = typeof conditionCode === 'string' ? conditionCode : ''
  return WEATHER_ATMOSPHERE[code] || WEATHER_ATMOSPHERE.sunny
}

function buildSceneBackgroundRule(weatherConditionCode) {
  return `${SCENE_BACKGROUND_BASE}。${buildWeatherAtmosphereHint(weatherConditionCode)}`
}

function buildCompositionHint() {
  return SCENE_COMPOSITION_HINT
}

function buildPieceListHint(pieceLabels, imageCount, startIndex) {
  const labels = (pieceLabels || []).filter(Boolean)
  if (labels.length > 0) {
    return labels.join('、')
  }
  const count = Math.max(1, imageCount)
  if (count === 1) {
    return `参考图${startIndex}中的衣物单品`
  }
  return `参考图${startIndex}至图${startIndex + count - 1}中的全部衣物单品`
}

function buildReferenceImageHint(imageCount, startIndex) {
  const count = Math.max(1, imageCount)
  if (count === 1) {
    return `参考附带图${startIndex}共 1 张衣物参考图`
  }
  return `参考附带图${startIndex}至图${startIndex + count - 1}共 ${count} 张衣物参考图`
}

function buildClothingItemLines(
  pieceLabels,
  pieceTypeNames,
  imageCount,
  startIndex,
) {
  const count = Math.max(1, imageCount)
  const labels = pieceLabels || []
  const types = pieceTypeNames || []
  const lines = []

  for (let i = 0; i < count; i += 1) {
    const label = labels[i]
    const typeName = types[i]
    const imageNo = startIndex + i
    if (label) {
      lines.push(
        typeName
          ? `- 图${imageNo}：${label}（${typeName}）`
          : `- 图${imageNo}：${label}`,
      )
    } else if (typeName) {
      lines.push(`- 图${imageNo}：${typeName}`)
    }
  }

  if (lines.length > 0) {
    return lines.join('\n')
  }

  const fallback = buildPieceListHint(pieceLabels, count, startIndex)
  return `- ${fallback}`
}

function buildClothingItemsBlock({
  pieceLabels = [],
  pieceTypeNames = [],
  imageCount = 1,
  hasModelTemplate = false,
}) {
  const count = Math.max(1, imageCount)
  const startIndex = clothingImageStartIndex(hasModelTemplate)
  const pieceCount = Math.max(
    (pieceLabels || []).filter(Boolean).length,
    count,
  )
  const refHint = buildReferenceImageHint(count, startIndex)
  const itemLines = buildClothingItemLines(
    pieceLabels,
    pieceTypeNames,
    count,
    startIndex,
  )
  const compositionHint = buildCompositionHint()

  const modelHint = hasModelTemplate
    ? `图1 为固定模特人物参考图：须保持其脸型、发型、肤质与人物身份一致，仅将服装替换为下列单品，不得另造面孔或更换人物身份；姿势不沿用图1，须采用下文指定的生活方式姿势。\n`
    : ''

  return `${modelHint}${refHint}，需试穿搭配的单品如下：
${itemLines}

视觉细节说明：各单品的款式、颜色、材质、图案等以对应参考图为准，须高度还原。
模特仅穿戴以上 ${pieceCount} 件单品，不得添加参考图以外的任何服装。
${compositionHint}。
${SCENE_POSE_HINT}。
人物在画面中水平居中，头顶与画面上边缘距离适中、留白自然，避免头部贴顶或被裁切。`
}

function buildPersonFeaturesBlock({
  heightCm,
  weightKg,
  gender,
  hasModelTemplate = false,
}) {
  const lines = []

  if (hasModelTemplate) {
    lines.push('- 人物基准：以附带图1 固定模特为人物身份与外观基准，勿另造面孔')
  }

  lines.push(`- 身高：${heightCm} cm`, `- 体重：${weightKg} kg`)

  const genderLabel = GENDER_LABELS[gender]
  if (genderLabel) {
    lines.push(`- 性别：${genderLabel}`)
  } else {
    lines.push('- 性别：未指定，选用中性自然形象')
  }

  if (hasModelTemplate) {
    lines.push(
      '- 体型：以图1 模特体态为主，可按上述身高体重作轻微自然比例调整，勿大幅改变身材或五官',
      '- 肤质：与图1 一致，真实自然，保留细腻肤质与柔和光影，避免蜡像感、过度磨皮或塑料感',
      '- 发型：与图1 保持一致',
      `- ${SCENE_POSE_HINT}`,
      `- ${SCENE_COMPOSITION_HINT}`,
    )
  } else {
    lines.push(
      '- 体型：符合上述身高体重的自然比例',
      '- 肤质：真实自然，保留细腻肤质与柔和光影，避免蜡像感、过度磨皮或塑料感',
      '- 发型：自然得体，与整体穿搭风格协调（无用户指定时由模型合理推断）',
      `- ${SCENE_POSE_HINT}`,
      `- ${SCENE_COMPOSITION_HINT}`,
    )
  }

  return lines.join('\n')
}

function buildTryonPrompt({
  heightCm,
  weightKg,
  gender,
  pieceLabels = [],
  pieceTypeNames = [],
  imageCount = 1,
  hasModelTemplate = false,
  weatherConditionCode,
}) {
  const clothingItems = buildClothingItemsBlock({
    pieceLabels,
    pieceTypeNames,
    imageCount,
    hasModelTemplate,
  })
  const personFeatures = buildPersonFeaturesBlock({
    heightCm,
    weightKg,
    gender,
    hasModelTemplate,
  })

  const rule1 = hasModelTemplate
    ? '以图1 固定模特为人物基准，将图2 起提供的衣物单品合理搭配并试穿在其身上（纯摄影风格）；保持图1 的脸型、发型、肤质与人物身份，勿另造面孔；姿势采用指定的生活方式全身姿势，不沿用图1 站姿'
    : '将所有提供的衣物单品合理搭配并展示在符合人物特征的虚拟模特身上（纯摄影风格）'

  const rule2 = buildSceneBackgroundRule(weatherConditionCode)

  const rule4 = hasModelTemplate
    ? '人物须与图1 模特身份一致；可按人物特征中的身高体重作轻微体型调整，但不得更换面孔、发型或人物身份'
    : '人物的体型、肤质、发型等特征需匹配提供的人物信息'

  const rule5 = `${SCENE_COMPOSITION_HINT}；${SCENE_POSE_HINT}；清晰展示衣物穿着效果与整体搭配`

  return TRYON_PROMPT_TEMPLATE
    .replace('{{CLOTHING_ITEMS}}', clothingItems)
    .replace('{{PERSON_FEATURES}}', personFeatures)
    .replace('{{RULE_1}}', rule1)
    .replace('{{RULE_2}}', rule2)
    .replace('{{RULE_4}}', rule4)
    .replace('{{RULE_5}}', rule5)
}

module.exports = {
  buildTryonPrompt,
  buildWeatherAtmosphereHint,
}
