export function createTempId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const RECOGNITION_FAIL_MESSAGE = "识别失败"
/** 识别结果页：部分单品按性别过滤后的提示文案 */
export const RECOGNITION_GENDER_FILTERED_TOAST = "已按性别过滤部分单品"
const RECOGNITION_FAIL_MESSAGE_LEGACY = "这次没识别出来，请换张图试试"
const RECOGNITION_TIMEOUT_MESSAGE = "识别时间有点长，请稍后再试"

/** 将识别失败底层错误转为用户可读文案 */
export function normalizeRecognitionErrorMessage(raw?: string): string {
  const message = typeof raw === "string" ? raw.trim() : ""
  if (!message) return RECOGNITION_FAIL_MESSAGE

  const lower = message.toLowerCase()
  if (
    message === "识别超时" ||
    message === RECOGNITION_TIMEOUT_MESSAGE ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("time limit") ||
    lower.includes("-504003") ||
    lower.includes("functionstimelimit")
  ) {
    return RECOGNITION_TIMEOUT_MESSAGE
  }

  if (
    message === RECOGNITION_FAIL_MESSAGE ||
    message === RECOGNITION_FAIL_MESSAGE_LEGACY
  ) {
    return RECOGNITION_FAIL_MESSAGE
  }

  return message
}
