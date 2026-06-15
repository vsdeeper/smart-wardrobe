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
}

const PROMPT_EXAMPLES = {
  positive: [
    {
      typeName: '上装',
      name: '圆领短袖T恤',
      tags: ['白色', '夏季', '休闲'],
    },
    {
      typeName: '连衣裙',
      name: '改良立领旗袍',
      tags: ['红色', '四季', '新中式'],
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
  return `typeName ${item.typeName}，name ${item.name}，tags ${JSON.stringify(item.tags)}`
}

function buildSystemPrompt() {
  const typeList = CLOTHING_TYPE_NAMES.join('、')
  const mergeExamples = formatMergeExamples()
  const { maxNameLength, minTags, maxTags, maxTagLength } = RECOGNITION_LIMITS
  const [positiveA, positiveB] = PROMPT_EXAMPLES.positive
  const negative = PROMPT_EXAMPLES.negative

  return `你是一个专业的衣物识别助手。根据用户上传的衣物照片，识别衣物类型和属性。

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

【name 与 tags 互斥】
- 正例：${formatPromptExample(positiveA)}
- 正例：${formatPromptExample(positiveB)}
- 反例：name ${negative.name}，tags ${JSON.stringify(negative.tags)}（${negative.reason}）

【保暖等级 warmthLevel】
- 整数 1–5：1 极薄（背心/吊带）→ 5 极厚（羽绒服/厚大衣）
- 根据面料厚度与季节属性综合判断

只返回 JSON，不要其他文字。格式：
{
  "typeName": "从上述列表选择一项",
  "name": "款式结构描述，不含颜色季节风格",
  "tags": ["颜色", "季节", "风格或材质"],
  "warmthLevel": 3
}`
}

const USER_PROMPT =
  `请识别这件衣物的类型、名称和标签。严格按 system 规则返回 JSON，typeName 不得超出给定列表。name 只描述款式结构，颜色/季节/风格/材质只写在 tags，且 tags 不得与 name 重复；每个 tag 不超过${RECOGNITION_LIMITS.maxTagLength}个字。同时返回 warmthLevel（1–5 保暖等级）。`

function parseRecognitionResult(parsed) {
  const typeName = String(parsed.typeName ?? '').trim()
  const name = String(parsed.name ?? '').trim()
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.map((tag) => String(tag ?? '').trim()).filter(Boolean)
    : []

  if (!typeName || !name) {
    throw new Error('AI 返回缺少必要字段')
  }

  let warmthLevel
  if (parsed.warmthLevel !== undefined && parsed.warmthLevel !== null) {
    const level = parseInt(String(parsed.warmthLevel), 10)
    if (!Number.isNaN(level)) {
      warmthLevel = Math.min(5, Math.max(1, level))
    }
  }

  const result = { typeName, name, tags }
  if (warmthLevel !== undefined) {
    result.warmthLevel = warmthLevel
  }
  return result
}

module.exports = {
  CLOTHING_TYPE_NAMES,
  TYPE_MERGE_GROUPS,
  RECOGNITION_LIMITS,
  buildSystemPrompt,
  USER_PROMPT,
  parseRecognitionResult,
}
