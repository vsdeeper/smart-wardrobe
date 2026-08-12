import { CREDITS_ERROR_INSUFFICIENT } from "@/constants/credits";
import type { CreditBalance, CreditCloudError } from "@/types/credits";
import { isCreditBalance } from "@/utils/credits";
import Taro from "@tarojs/taro";

/**
 * 查询当前用户积分余额（首次调用会自动赠送体验积分）。
 */
export async function fetchCreditBalance(): Promise<CreditBalance> {
  const { result } = await Taro.cloud.callFunction({
    name: "credits",
    data: { action: "balance" },
  });

  const data = result as CreditBalance | CreditCloudError;
  if (!isCreditBalance(data)) {
    throw new Error(data.message || data.error || "积分查询失败");
  }
  return data;
}

/**
 * 释放试穿预占：缓存命中已有试穿图、无需重新出图时调用。
 */
export async function releaseCreditHold(creditHoldId: string): Promise<void> {
  if (!creditHoldId) return;

  const { result } = await Taro.cloud.callFunction({
    name: "credits",
    data: { action: "releaseHold", creditHoldId },
  });

  const data = result as { ok?: boolean; error?: string; message?: string };
  if (data.error && data.error !== CREDITS_ERROR_INSUFFICIENT) {
    console.warn("[credits] releaseHold failed:", data.message || data.error);
  }
}
