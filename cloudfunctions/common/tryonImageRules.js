const HEAD_COMPOSITION_HINT =
  '；人物水平居中，头顶与画面上边缘留白适中；头部完整入镜，头顶与面部清晰可见，不得裁切或遮挡头部'

const GENDER_LABELS = {
  male: '男',
  female: '女',
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
1. 将所有提供的衣物单品合理搭配并展示在符合人物特征的虚拟模特身上（纯摄影风格）
2. 背景使用随机的浅色柔和色调（如浅灰、米白、淡蓝等），简洁无杂物
3. 确保衣物的款式、颜色、材质等细节与参考图及单品信息一致
4. 人物的体型、肤质、发型等特征需匹配提供的人物信息
5. 效果图需清晰展示衣物的穿着效果和整体搭配；人物在画面中居中，头部与上边缘距离合适

最终输出要求：
- 仅输出试穿效果图的图片文件，不包含任何文字说明
- 画面中不得出现任何中文、英文、数字、标题、水印或 UI 排版文字
- 图片需达到高清质量，能够清晰展示衣物细节和穿着效果
- 确保图片格式符合常见的图像标准（如 JPG、PNG 等）

请直接生成并输出符合要求的试穿效果图。`

function buildCompositionHint(pieceTypeNames) {
  const types = Array.isArray(pieceTypeNames) ? pieceTypeNames : []
  const hasShoes = types.includes('鞋靴')
  const hasLowerGarment = types.some(
    (t) => t === '下装' || t === '连衣裙',
  )

  if (hasShoes) {
    return `全身构图，清晰展示鞋履及全部推荐单品，人物占画面主体大部分${HEAD_COMPOSITION_HINT}`
  }
  if (hasLowerGarment) {
    return `全身或至少至膝/踝构图，清晰展示下装或连衣裙等推荐单品，人物占画面主体大部分${HEAD_COMPOSITION_HINT}`
  }
  return `上半身构图，裁切至腰/髋部以上，突出展示推荐单品，不展示参考图以外的下装、短裤或鞋履${HEAD_COMPOSITION_HINT}`
}

function buildPieceListHint(pieceLabels, imageCount) {
  const labels = (pieceLabels || []).filter(Boolean)
  if (labels.length > 0) {
    return labels.join('、')
  }
  const count = Math.max(1, imageCount)
  return count === 1 ? '参考图1中的衣物单品' : `参考图1至图${count}中的全部衣物单品`
}

function buildReferenceImageHint(imageCount) {
  const count = Math.max(1, imageCount)
  if (count === 1) {
    return '参考附带图1共 1 张衣物参考图'
  }
  return `参考附带图1至图${count}共 ${count} 张衣物参考图`
}

function buildClothingItemLines(pieceLabels, pieceTypeNames, imageCount) {
  const count = Math.max(1, imageCount)
  const labels = pieceLabels || []
  const types = pieceTypeNames || []
  const lines = []

  for (let i = 0; i < count; i += 1) {
    const label = labels[i]
    const typeName = types[i]
    if (label) {
      lines.push(
        typeName ? `- 图${i + 1}：${label}（${typeName}）` : `- 图${i + 1}：${label}`,
      )
    } else if (typeName) {
      lines.push(`- 图${i + 1}：${typeName}`)
    }
  }

  if (lines.length > 0) {
    return lines.join('\n')
  }

  const fallback = buildPieceListHint(pieceLabels, count)
  return `- ${fallback}`
}

function buildClothingItemsBlock({
  pieceLabels = [],
  pieceTypeNames = [],
  imageCount = 1,
}) {
  const count = Math.max(1, imageCount)
  const pieceCount = Math.max(
    (pieceLabels || []).filter(Boolean).length,
    count,
  )
  const refHint = buildReferenceImageHint(count)
  const itemLines = buildClothingItemLines(pieceLabels, pieceTypeNames, count)
  const compositionHint = buildCompositionHint(pieceTypeNames)

  return `${refHint}，需试穿搭配的单品如下：
${itemLines}

视觉细节说明：各单品的款式、颜色、材质、图案等以对应参考图为准，须高度还原。
模特仅穿戴以上 ${pieceCount} 件单品，不得添加参考图以外的任何服装。
${compositionHint}。
自然站立姿势。
人物在画面中水平居中，头顶与画面上边缘距离适中、留白自然，避免头部贴顶或被裁切。`
}

function buildPersonFeaturesBlock({ heightCm, weightKg, gender }) {
  const lines = [
    `- 身高：${heightCm} cm`,
    `- 体重：${weightKg} kg`,
  ]

  const genderLabel = GENDER_LABELS[gender]
  if (genderLabel) {
    lines.push(`- 性别：${genderLabel}`)
  } else {
    lines.push('- 性别：未指定，选用中性自然形象')
  }

  lines.push(
    '- 体型：符合上述身高体重的自然比例',
    '- 肤质：真实自然，保留细腻肤质与柔和光影，避免蜡像感、过度磨皮或塑料感',
    '- 发型：自然得体，与整体穿搭风格协调（无用户指定时由模型合理推断）',
    '- 构图：人物水平居中；头部完整入镜，头顶与面部清晰可见，头顶与画面上边缘留白适中，不得裁切或遮挡头部',
  )

  return lines.join('\n')
}

function buildTryonPrompt({
  heightCm,
  weightKg,
  gender,
  pieceLabels = [],
  pieceTypeNames = [],
  imageCount = 1,
}) {
  const clothingItems = buildClothingItemsBlock({
    pieceLabels,
    pieceTypeNames,
    imageCount,
  })
  const personFeatures = buildPersonFeaturesBlock({
    heightCm,
    weightKg,
    gender,
  })

  return TRYON_PROMPT_TEMPLATE
    .replace('{{CLOTHING_ITEMS}}', clothingItems)
    .replace('{{PERSON_FEATURES}}', personFeatures)
}

module.exports = {
  buildTryonPrompt,
}
