const ITEM_DISPLAY_BG = '#F0F0F0' // 与 src/styles/theme.scss --sw-color-image-bg 一致

const BACKGROUND_RULES = `【背景硬性要求 — 最高优先级】
- 背景必须是均匀纯色 RGB(240,240,240) / ${ITEM_DISPLAY_BG}，全图可见区域均为该浅灰底，不得有任何色相偏移
- 电商产品图布光：背景为均匀中性浅灰工作室底，禁止纯白过曝（#FFFFFF）、过浅灰（如 #F7F7F7）、深灰底、米白、暖白、冷白、米色或任何色调偏移
- 禁止：阴影、接触阴影、投影、渐变、晕影、纹理、噪点、环境光染色
- 衣物边缘直接落在 ${ITEM_DISPLAY_BG} 背景上，不得出现衣物下方的灰色晕圈或 soft shadow`

/** 临时限制：Seedream 每次只生成 1 张展示图，避免云函数超时 */
const DISPLAY_IMAGE_MAX_COUNT = 1

const TYPE_CONSTRAINTS = {
  上装: {
    include: '仅上装（T恤/衬衫/卫衣等），平铺或挂拍',
    exclude: '下装、鞋靴、外套叠穿、模特',
  },
  下装: {
    include: '仅裤装/半裙/短裤',
    exclude: '上装、鞋靴、模特',
  },
  连衣裙: {
    include: '仅整条连衣裙',
    exclude: '上下分体、外套、鞋靴、模特',
  },
  外套: {
    include: '仅外套/大衣/夹克',
    exclude: '内搭上下装、鞋靴、模特',
  },
  运动: {
    include: '仅识别出的那件运动类单品',
    exclude: '其他品类、模特',
  },
  鞋靴: {
    include: '仅鞋/靴（一双或单只产品图）',
    exclude: '全身、裤脚、上装、模特',
  },
  配饰: {
    include: '仅该配饰（包/帽/围巾/腰带等）',
    exclude: '成衣、鞋靴、模特',
  },
  其他: {
    include: '仅识别出的那件单品',
    exclude: '任何额外衣物、模特',
  },
}

function buildItemTypeConstraints(typeName) {
  const key = String(typeName ?? '').trim()
  const rule = TYPE_CONSTRAINTS[key] || TYPE_CONSTRAINTS.其他
  return `画面应含：${rule.include}；禁止：${rule.exclude}`
}

function formatItemLine(index, item) {
  const tags = Array.isArray(item.tags) ? item.tags.join('、') : ''
  const constraints = buildItemTypeConstraints(item.typeName)
  return `- 展示图${index + 1}：从原图提取 → ${item.typeName} · ${item.name}${tags ? ` · tags: ${tags}` : ''}（${constraints}）`
}

function selectItemsForDisplayGeneration(items) {
  const list = Array.isArray(items) ? items : []
  if (list.length === 0) {
    throw new Error('缺少待生成展示图的单品列表')
  }
  return list.slice(0, DISPLAY_IMAGE_MAX_COUNT)
}

function buildItemsDisplayPrompt(items) {
  const list = selectItemsForDisplayGeneration(items)
  const itemLines = list.map((item, index) => formatItemLine(index, item)).join('\n')
  const count = list.length

  return `参考附带原图（图1），请从原图中提取下列衣物单品，生成 ${count} 张 RGB(240,240,240) 浅灰底电商产品展示图（background color exactly ${ITEM_DISPLAY_BG}）。
不得自行识别、增删或调换顺序；不得脱离原图凭空生成。

<items>
${itemLines}
</items>

${BACKGROUND_RULES}

提取要求：
- 从原图中对应位置/区域提取，保留原图该件的款式、颜色、材质、图案，以及衣物上的品牌 logo、标贴、印花文字等细节（须与原图一致，不得抹除或篡改）
- 单品居中，约占画面 85–90%；四边各留约 5–8% ${ITEM_DISPLAY_BG} 空白，画面饱满，不得留大片空边，也不得贴边裁切衣物
- 平铺或挂拍，无模特
- 画面中不得出现原图以外的叠加文字、照片水印、边框或 UI 元素；衣物本体上的 logo/印花除外
- 只含清单中的那件单品，不含原图中其他衣物`
}

module.exports = {
  DISPLAY_IMAGE_MAX_COUNT,
  buildItemTypeConstraints,
  selectItemsForDisplayGeneration,
  buildItemsDisplayPrompt,
}
