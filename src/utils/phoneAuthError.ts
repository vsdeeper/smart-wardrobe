/** 将 getPhoneNumber 回调 errMsg 转为用户可读提示；用户主动取消时不提示 */
export function getPhoneAuthErrorToast(errMsg?: string): string | null {
  if (!errMsg || errMsg === "getPhoneNumber:ok") return null;

  const lower = errMsg.toLowerCase();
  if (lower.includes("cancel") || lower.includes("deny")) return null;

  if (lower.includes("no permission")) {
    return "暂无手机号权限，请确认小程序已认证并在后台配置隐私协议";
  }
  if (lower.includes("privacy") || lower.includes("112")) {
    return "请先同意隐私协议后再授权手机号";
  }
  if (lower.includes("1400001")) {
    return "手机号验证额度不足，请联系管理员";
  }

  return "获取手机号失败，请稍后重试";
}
