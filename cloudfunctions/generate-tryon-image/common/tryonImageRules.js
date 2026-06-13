const HEAD_COMPOSITION_HINT =
  '；头部完整入镜，头顶与面部清晰可见，不得裁切或遮挡头部'

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
  return `上半身构图，裁切至腰/髋部以上，人物占画面 70%–85%，突出展示推荐单品，不展示参考图以外的下装、短裤或鞋履${HEAD_COMPOSITION_HINT}`
}
function buildPieceListHint(pieceLabels, imageCount) {
  const labels = (pieceLabels || []).filter(Boolean)
  if (labels.length > 0) {
    return labels.join('、')
  }
  const count = Math.max(1, imageCount)
  return count === 1 ? '参考图1中的衣物单品' : `参考图1至图${count}中的全部衣物单品`
}

function buildTryonPrompt({
  heightCm,
  weightKg,
  pieceLabels = [],
  pieceTypeNames = [],
  imageCount = 1,
}) {
  const count = Math.max(1, imageCount)
  const refHint =
    count === 1
      ? '参考附带的图1衣物图片，'
      : `参考附带的图1至图${count}多件衣物图片，`

  const pieceList = buildPieceListHint(pieceLabels, count)
  const compositionHint = buildCompositionHint(pieceTypeNames)

  return `${refHint}为身高 ${heightCm} cm、体重 ${weightKg} kg 的模特生成一张纯摄影风格的虚拟试穿效果图，画面中不得出现任何中文、英文、数字、标题、水印或 UI 排版文字。
模特仅穿戴参考图中的以下 ${Math.max(pieceLabels.length, count)} 件单品：${pieceList}；不得添加参考图以外的任何服装。
${compositionHint}；自然站立姿势；背景简洁浅灰渐变。
要求：人物体型符合上述身高体重；构图须保证头部完整，不可只拍到下巴或半张脸；人物皮肤真实自然，保留细腻肤质与柔和光影，避免蜡像感、过度磨皮或塑料感。`
}

module.exports = {
  buildTryonPrompt,
}
