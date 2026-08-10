const CLOTHING_TYPE_NAMES = [
  '上装',
  '下装',
  '连衣裙',
  '外套',
  '运动',
  '鞋靴',
  '配饰',
  '其他',
]

const TYPE_MERGE_GROUPS = [
  { target: '上装', examples: ['T恤', '衬衫', '毛衣', '针织'] },
  { target: '下装', examples: ['牛仔裤', '半裙', '短裤', '裤装'] },
  { target: '连衣裙', examples: ['旗袍', '改良旗袍', '古典旗袍'] },
]

const RECOGNITION_LIMITS = {
  maxNameLength: 10,
  minTags: 2,
  maxTags: 9,
  maxTagLength: 5,
  maxItems: 5,
}

const AUDIENCE_GENDERS = new Set(['male', 'female', 'unisex'])

const PROMPT_EXAMPLES = {
  positive: [
    {
      typeName: '上装',
      name: '圆领短袖T恤',
      tags: ['白色', '夏季', '休闲'],
      audienceGender: 'unisex',
      stylingAdvice: '白色棉质休闲款，适合日常通勤与周末出行，可搭牛仔裤或短裤。',
    },
    {
      typeName: '连衣裙',
      name: '改良立领旗袍',
      tags: ['红色', '四季', '新中式'],
      audienceGender: 'female',
      stylingAdvice: '红色新中式气质款，适合宴请与节日场合，可配盘扣包或细跟鞋。',
    },
  ],
  negative: {
    name: '白色休闲T恤',
    tags: ['白色', '休闲'],
    reason: '颜色/风格与 name 重复，错误',
  },
}

function formatMergeExamples() {
  return TYPE_MERGE_GROUPS.map(
    (group) => `${group.examples.join('/')} → ${group.target}`,
  ).join('；')
}

function formatPromptExample(item) {
  return `typeName ${item.typeName}，name ${item.name}，tags ${JSON.stringify(item.tags)}，audienceGender ${item.audienceGender}，stylingAdvice ${item.stylingAdvice}`
}

function buildSystemPrompt() {
  const typeList = CLOTHING_TYPE_NAMES.join('、')
  const mergeExamples = formatMergeExamples()
  const { maxNameLength, minTags, maxTags, maxTagLength, maxItems } = RECOGNITION_LIMITS
  const [positiveA, positiveB] = PROMPT_EXAMPLES.positive
  const negative = PROMPT_EXAMPLES.negative

  return `你是一个专业的衣物识别助手。根据用户上传的衣物照片，识别图中所有可见衣物单品及其类型和属性。

【识别范围】
- 识别照片中所有可见的衣物单品（平铺、穿搭、镜拍均可）
- 每件单品独立一条，按从左到右、从上到下的视觉顺序排列
- 最多 ${maxItems} 件，超出时只保留最明显的 ${maxItems} 件
- 若无法识别任何衣物，返回 "items": []

【分类规则 typeName】
- typeName 必须且只能从以下列表中选择一项：${typeList}
- 禁止自造类别，禁止在 typeName 中带风格修饰（如改良、古典、复古等）
- 归并示例：${mergeExamples}
- 无法明确归类时选「其他」

【名称规则 name】
- 只描述款式与结构：具体品类细分 + 结构特征（如 立领短袖衬衫、高腰A字半裙、连帽卫衣）
- 中文简短描述，不超过${maxNameLength}个字（含标点）
- 禁止写入：颜色、季节、材质、风格形容词（这些只属于 tags）
- 不要写在 typeName 里的风格修饰，可写入 name（如 改良立领旗袍）

【标签规则 tags】
- 字符串数组，建议${minTags}-${maxTags}个
- 每个 tag 不超过${maxTagLength}个字（含标点），使用简短词组
- 只放结构化属性，与 name 互斥
- 优先级：① 颜色 → ② 季节（春/夏/秋/冬/四季）→ ③ 风格、版型、材质等
- 颜色、季节必须放在 tags，不得放进 name
- 禁止 tags 中出现 name 里已有的词或同义表达

【适用人群 audienceGender】
- 每件须返回 audienceGender，取值仅 "male" | "female" | "unisex"
- 男女通用、无明显性别特征的基础款 → unisex
- 仅当款式有明显性别特征时标 male 或 female（如文胸、吊带裙、男士西裤、领带等）
- 不确定时标 unisex，勿过度标注

【穿搭建议 stylingAdvice】
- 每件须返回 stylingAdvice，中文成句
- 内容须涵盖：衣物本身特性（风格、颜色、材质等）+ 穿着场景建议 + 搭配建议
- 建议不超过 60 个字；可综合 tags 信息，避免与 name 机械重复堆砌

【name 与 tags 互斥】
- 正例：${formatPromptExample(positiveA)}
- 正例：${formatPromptExample(positiveB)}
- 反例：name ${negative.name}，tags ${JSON.stringify(negative.tags)}（${negative.reason}）

只返回合法 JSON 对象，不要 Markdown 代码块或其他文字。所有字符串必须用双引号包裹（含 tags 内每一项）。格式：
{
  "items": [
    {
      "typeName": "从上述列表选择一项",
      "name": "款式结构描述，不含颜色季节风格",
      "tags": ["颜色", "季节", "风格或材质"],
      "audienceGender": "unisex",
      "stylingAdvice": "特性+场景+搭配建议，建议不超过60字"
    }
  ]
}`
}

const USER_PROMPT =
  `请识别照片中所有可见衣物单品，严格按 system 规则返回 JSON 的 items 数组。typeName 不得超出给定列表；每件 name 只描述款式结构，颜色/季节/风格/材质只写在 tags，且 tags 不得与 name 重复；每个 tag 不超过${RECOGNITION_LIMITS.maxTagLength}个字。每件同时返回 audienceGender 与 stylingAdvice（特性+场景+搭配建议，建议不超过60字）。`

function normalizeAudienceGender(raw) {
  const value = String(raw ?? '').trim()
  if (AUDIENCE_GENDERS.has(value)) {
    return value
  }
  return 'unisex'
}

function normalizeModelContent(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part.text === 'string') return part.text
        return ''
      })
      .join('')
  }
  return String(content ?? '')
}

function stripCodeFence(text) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced ? fenced[1].trim() : trimmed
}

/** 按括号深度提取首个 JSON 对象，避免贪婪正则把后续说明文字一并吞入 */
function extractBalancedJsonObject(text) {
  const start = text.indexOf('{')
  if (start < 0) return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]
    if (inString) {
      if (escape) {
        escape = false
      } else if (ch === '\\') {
        escape = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, i + 1)
    }
  }

  return null
}

function parseJsonFromModelContent(content) {
  const text = stripCodeFence(normalizeModelContent(content))
  if (!text) {
    throw new Error('AI 返回为空')
  }

  const candidates = []
  candidates.push(text)
  const balanced = extractBalancedJsonObject(text)
  if (balanced && balanced !== text) {
    candidates.push(balanced)
  }

  let lastError
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch (err) {
      lastError = err
    }
  }

  const preview = text.length > 400 ? `${text.slice(0, 400)}…` : text
  console.error('[recognize-clothing] JSON 解析失败，原始内容预览:', preview)
  throw new Error(lastError instanceof Error ? lastError.message : 'AI 返回格式无效')
}

function parseRecognitionContent(content) {
  const parsed = parseJsonFromModelContent(content)
  return parseRecognitionItems(parsed)
}

function parseRecognitionResult(parsed) {
  const typeName = String(parsed.typeName ?? '').trim()
  const name = String(parsed.name ?? '').trim()
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.map((tag) => String(tag ?? '').trim()).filter(Boolean)
    : []
  const stylingAdvice = String(parsed.stylingAdvice ?? '').trim()

  if (!typeName || !name) {
    throw new Error('AI 返回缺少必要字段')
  }

  return {
    typeName,
    name,
    tags,
    audienceGender: normalizeAudienceGender(parsed.audienceGender),
    stylingAdvice,
  }
}

function parseRecognitionItems(parsed) {
  let rawItems = parsed?.items

  if (!Array.isArray(rawItems) && (parsed?.typeName || parsed?.name)) {
    rawItems = [parsed]
  }

  if (!Array.isArray(rawItems)) {
    throw new Error('AI 返回缺少 items 数组')
  }

  if (rawItems.length === 0) {
    throw new Error('未识别到衣物单品')
  }

  const maxItems = RECOGNITION_LIMITS.maxItems
  const slice = rawItems.slice(0, maxItems)
  if (rawItems.length > maxItems) {
    console.warn(`[recognize-clothing] items 超出上限 ${maxItems}，已截断`)
  }

  return slice.map((item) => parseRecognitionResult(item))
}

function filterItemsByUserGender(items, userGender) {
  if (userGender !== 'male' && userGender !== 'female') {
    return { items, filteredCount: 0 }
  }

  const opposite = userGender === 'male' ? 'female' : 'male'
  const filtered = items.filter((item) => item.audienceGender !== opposite)
  const filteredCount = items.length - filtered.length

  const publicItems = filtered.map(({ audienceGender, ...rest }) => rest)

  return { items: publicItems, filteredCount }
}

module.exports = {
  CLOTHING_TYPE_NAMES,
  TYPE_MERGE_GROUPS,
  RECOGNITION_LIMITS,
  buildSystemPrompt,
  USER_PROMPT,
  parseRecognitionContent,
  parseRecognitionResult,
  parseRecognitionItems,
  filterItemsByUserGender,
}
