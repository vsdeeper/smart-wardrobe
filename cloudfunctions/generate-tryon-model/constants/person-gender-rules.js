/** 人物性别检测的 prompt 与阻断阈值（仅用于自定义模特生成的严格拦截校验） */

/** 明确判定所需的最低置信度：低于此值视为无法明确判断 */
const BLOCK_CONFIDENCE_THRESHOLD = 0.7

const PERSON_GENDER_USER_PROMPT =
  '请判断照片中人物的性别，严格按 system 规则只输出 JSON：{"gender":"male"|"female"|"unknown","confidence":number,"reason":"简短原因"}'

function buildPersonGenderSystemPrompt() {
  return `你是一个严谨的人物性别识别助手。根据用户上传的本人照片判断人物的性别。

【适用图片】
- 全身照或清晰上半身照均可，仅要求人物清晰可见
- 只对「清晰可见、成年的单一人物」做出性别判断

【输出规则 gender】
- 仅当能明确判定人物性别时返回 "male" 或 "female"
- 以下情况一律返回 "unknown"：画面中无人、出现多人、人物为儿童、面部严重遮挡、照片模糊、非真人（卡通、雕塑、AI 生成图等）
- 无法明确判断时宁可为 "unknown"，不要猜测

【置信度 confidence】
- 0-1 的小数，仅当对判定非常有把握时才给 >= 0.8
- 误报比 unknown 更不可接受：稍有犹豫就给低置信度或 unknown

【reason】
- 简短说明判定依据，中文，不超过 20 字

只返回合法 JSON 对象，不要 Markdown 代码块或其他文字。`
}

module.exports = {
  BLOCK_CONFIDENCE_THRESHOLD,
  PERSON_GENDER_USER_PROMPT,
  buildPersonGenderSystemPrompt,
}
