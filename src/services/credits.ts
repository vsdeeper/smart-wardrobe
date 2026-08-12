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
