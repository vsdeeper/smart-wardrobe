/**
 * 人物性别检测：调用视觉模型分析上传的本人照片，输出 gender 判定。
 * 调用方式与 seed-recognize.js 保持一致（OpenAI 兼容 /chat/completions）。
 */
const {
  buildPersonGenderSystemPrompt,
  PERSON_GENDER_USER_PROMPT,
  BLOCK_CONFIDENCE_THRESHOLD,
} = require('../constants/person-gender-rules')

/** 去除 Markdown 代码块围栏 */
function stripCodeFence(text) {
  const trimmed = String(text ?? '').trim()
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

function parseJsonFromContent(content) {
  const text = stripCodeFence(content)
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

  const preview = text.length > 200 ? `${text.slice(0, 200)}…` : text
  console.error('[analyze-person-gender] JSON 解析失败，原始内容预览:', preview)
  throw new Error(lastError instanceof Error ? lastError.message : 'AI 返回格式无效')
}

function normalizeGender(raw) {
  const value = String(raw ?? '').trim()
  if (value === 'male' || value === 'female' || value === 'unknown') {
    return value
  }
  return 'unknown'
}

/**
 * 调用视觉模型判断人物性别。
 * @returns {Promise<{ gender: 'male'|'female'|'unknown', confidence: number, reason: string }>}
 * LLM 调用或解析失败时抛错，由调用方 catch 后转为阻断。
 */
async function analyzePersonGender({ imageUrl, apiKey, baseUrl, model }) {
  let response
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildPersonGenderSystemPrompt() },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: PERSON_GENDER_USER_PROMPT },
            ],
          },
        ],
      }),
    })
  } catch (err) {
    // 网络/超时等传输层失败：API 未完成，标记供调用方免收基础费
    const e = err instanceof Error ? err : new Error(String(err))
    e.code = 'LLM_API_ERROR'
    throw e
  }

  const data = await response.json()
  if (!response.ok) {
    const errMsg =
      data?.error?.message || data?.message || `HTTP ${response.status}`
    const err = new Error(errMsg)
    err.code = 'LLM_API_ERROR'
    throw err
  }

  const content = data?.choices?.[0]?.message?.content ?? ''
  let parsed
  try {
    parsed = parseJsonFromContent(content)
  } catch (err) {
    // 200 已返回但 JSON 无效：API 调用已完成，标记供调用方判定是否收基础费
    const e = err instanceof Error ? err : new Error(String(err))
    e.code = 'PARSE_ERROR'
    throw e
  }
  const confidence = Number(parsed.confidence)

  return {
    gender: normalizeGender(parsed.gender),
    confidence: Number.isFinite(confidence) ? confidence : 0,
    reason:
      typeof parsed.reason === 'string' ? parsed.reason.slice(0, 20) : '',
  }
}

/**
 * 严格判定：仅「确定性别 + 高置信 + 与资料性别一致」放行；
 * 其余（相反性别 / unknown / 低置信）一律阻断并提示。
 * @returns {{ blocked: false } | { blocked: true, code: 'GENDER_MISMATCH'|'GENDER_UNKNOWN', message: string }}
 */
function resolveGenderBlock(analysis, profileGender) {
  const gender = analysis?.gender
  const confidence = Number(analysis?.confidence)

  if (gender === 'male' || gender === 'female') {
    if (gender !== profileGender) {
      return {
        blocked: true,
        code: 'GENDER_MISMATCH',
        message: '照片与您的性别不符，请更换照片',
      }
    }
    if (confidence >= BLOCK_CONFIDENCE_THRESHOLD) {
      return { blocked: false }
    }
    return {
      blocked: true,
      code: 'GENDER_UNKNOWN',
      message: '无法识别人物性别，请换张清晰照片',
    }
  }

  return {
    blocked: true,
    code: 'GENDER_UNKNOWN',
    message: '无法识别人物性别，请换张清晰照片',
  }
}

module.exports = {
  analyzePersonGender,
  resolveGenderBlock,
  BLOCK_CONFIDENCE_THRESHOLD,
}
