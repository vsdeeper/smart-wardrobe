/** 将 getPhoneNumber 回调 errMsg 转为用户可读提示；用户主动取消时不提示 */
export function getPhoneAuthErrorToast(errMsg?: string): string | null {
  if (!errMsg || errMsg === "getPhoneNumber:ok") return null;

  const lower = errMsg.toLowerCase();
  if (lower.includes("cancel") || lower.includes("deny")) return null;

  if (lower.includes("no permission")) {
    return "暂时无法授权手机号，请稍后重试";
  }
  if (lower.includes("privacy") || lower.includes("112")) {
    return "请先同意隐私协议后再授权手机号";
  }
  if (lower.includes("1400001")) {
    return "手机号绑定次数已用完，请稍后再试";
  }

  return "没能绑定手机号，请稍后重试";
}
