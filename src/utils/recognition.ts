export function createTempId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** 将识别失败底层错误转为用户可读文案 */
export function normalizeRecognitionErrorMessage(raw?: string): string {
  const message = typeof raw === "string" ? raw.trim() : ""
  if (!message) return "识别失败"

  const lower = message.toLowerCase()
  if (
    message === "识别超时" ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("time limit") ||
    lower.includes("-504003") ||
    lower.includes("functionstimelimit")
  ) {
    return "识别超时"
  }

  return message
}
