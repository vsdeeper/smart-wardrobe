/**
 * 常见底层英文错误 → 中文友好文案。
 * 仅覆盖正常运行时状态（超时/限流/额度/鉴权）；代码/部署层面错误（如
 * `-504002` / `Cannot find module`）不做专门映射，统一回退调用方 fallback。
 */
const ERROR_PATTERN_MAP: ReadonlyArray<{ pattern: RegExp; message: string }> = [
  {
    // `\b504\b` 避免误伤 `-504002` 这类 CloudBase 错误码；`-504003` 是超时码需显式命中
    pattern:
      /timeout|timed\s*out|time\s*limit|\b504\b|-504003|functionstimelimit/i,
    message: "请求超时，请稍后重试",
  },
  {
    pattern: /rate\s*limit|too\s*many\s*requests|429/i,
    message: "操作太频繁，请稍后重试",
  },
  {
    pattern: /insufficient\s*(balance|quota)|\bquota\b|欠费|余额不足/i,
    message: "服务额度不足，请稍后重试",
  },
  {
    pattern: /api\s*key|authentication|unauthorized|invalid|401|403/i,
    message: "服务配置异常，请稍后重试",
  },
];

/**
 * 从异常对象提取可读消息：优先 Error.message，其次 Taro/微信的 { errCode, errMsg } 对象。
 * `cloud.callFunction:fail` 的 rejection 是普通对象而非 Error 实例，需单独兜底。
 */
function extractMessage(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const candidate = err as { errMsg?: unknown; message?: unknown };
    if (typeof candidate.errMsg === "string" && candidate.errMsg.trim()) {
      return candidate.errMsg;
    }
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message;
    }
  }
  return undefined;
}

/**
 * 将底层/服务端错误转为用户可读中文文案；无法识别时返回调用方提供的 fallback。
 *
 * - 以中文为主的提示（CJK 占比 ≥ 0.3）原样保留：服务端中文文案、本地校验提示不受影响；
 *   英文堆栈里内嵌的中文尾巴（如 CloudBase「更多错误信息请访问」）占比极低，不会被误判保留。
 * - 英文透传消息（LLM/HTTP/云函数调用）按已知模式映射为中文，未知英文回退 fallback，
 *   避免把英文堆栈直接暴露给用户。
 *
 * @param err      捕获到的异常（Error 实例，或 Taro/微信的 { errCode, errMsg } 对象）
 * @param fallback 未知错误时的中文兜底文案
 */
export function toUserMessage(err: unknown, fallback: string): string {
  const raw = extractMessage(err);
  if (!raw) return fallback;
  const msg = raw.trim();
  if (!msg) return fallback;

  const cjkCount = (msg.match(/[一-龥]/g) ?? []).length;
  if (cjkCount / msg.length >= 0.3) return msg;

  for (const { pattern, message } of ERROR_PATTERN_MAP) {
    if (pattern.test(msg)) return message;
  }
  return fallback;
}
