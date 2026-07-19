/** 固定模特模板匹配：仅按性别选 standard preset，变体由 openid 稳定哈希 */

const MODEL_TEMPLATE_FILE_IDS = require('./modelTemplateFileIds')

const VARIANT_COUNT = 3

function hashOpenId(openid) {
  const text = String(openid || '')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash
}

function formatVariant(index) {
  return String(index + 1).padStart(2, '0')
}

/**
 * @param {{ gender: 'male' | 'female', openid?: string }} params
 * @returns {{ templateId: string, presetId: string, variant: string }}
 */
function matchModelTemplate({ gender, openid }) {
  if (gender !== 'male' && gender !== 'female') {
    throw new Error(`无效性别: ${gender}`)
  }

  const presetId = `${gender}-standard`
  const variantIndex = hashOpenId(openid) % VARIANT_COUNT
  const variant = formatVariant(variantIndex)
  return {
    templateId: `${presetId}-${variant}`,
    presetId,
    variant,
  }
}

function getConfiguredFileId(templateId, fileIdMap) {
  const fileId = fileIdMap?.[templateId]
  return typeof fileId === 'string' && fileId.trim() ? fileId.trim() : null
}

/**
 * 解析模板 fileID：优先目标变体，缺图回退同性别 *-standard-01。
 * @returns {{ templateId: string, fileId: string } | null}
 */
function resolveModelTemplateFileId(
  templateId,
  fileIdMap = MODEL_TEMPLATE_FILE_IDS,
) {
  const primary = getConfiguredFileId(templateId, fileIdMap)
  if (primary) {
    return { templateId, fileId: primary }
  }

  const match = String(templateId || '').match(/^(female|male)-standard-\d{2}$/)
  if (!match) return null

  const fallbackId = `${match[1]}-standard-01`
  if (fallbackId === templateId) return null

  const fallback = getConfiguredFileId(fallbackId, fileIdMap)
  if (fallback) {
    return { templateId: fallbackId, fileId: fallback }
  }

  return null
}

module.exports = {
  VARIANT_COUNT,
  matchModelTemplate,
  resolveModelTemplateFileId,
  MODEL_TEMPLATE_FILE_IDS,
}
