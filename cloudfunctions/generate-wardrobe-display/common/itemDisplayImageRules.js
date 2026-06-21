const ITEM_DISPLAY_BG = '#FAFAF9' // 与 src/styles/theme.scss --sw-color-image-bg 一致
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

function buildItemsDisplayPrompt(items) {
  const list = Array.isArray(items) ? items : []
  if (list.length === 0) {
    throw new Error('缺少待生成展示图的单品列表')
  }

  const itemLines = list.map((item, index) => formatItemLine(index, item)).join('\n')
  const count = list.length

  return `参考附带原图（图1），请从原图中按下列清单逐件提取衣物单品，共生成 ${count} 张 ${ITEM_DISPLAY_BG} 暖米白底电商产品展示图。
不得自行识别、增删或调换顺序；不得脱离原图凭空生成。

<items>
${itemLines}
</items>

提取要求：
- 每件从原图中对应位置/区域提取，保留原图该件的款式、颜色、材质、图案，以及衣物上的品牌 logo、标贴、印花文字等细节（须与原图一致，不得抹除或篡改）
- 背景为均匀纯色 ${ITEM_DISPLAY_BG}（暖米白，与 App 图片占位底色一致），无渐变、无阴影、无纹理
- 单品居中，约占画面 70–75%；四边各留约 12–15% 空白，不得贴边或裁切至边缘
- 平铺或挂拍，无模特
- 第 i 张展示图只含清单第 i 件，不含原图中其他衣物
- 画面中不得出现原图以外的叠加文字、照片水印、边框或 UI 元素；衣物本体上的 logo/印花除外
- 共恰好 ${count} 张，展示图1 对应清单第 1 件，以此类推`
}

module.exports = {
  buildItemTypeConstraints,
  buildItemsDisplayPrompt,
}
