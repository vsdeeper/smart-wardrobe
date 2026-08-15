import {
  CREDITS_ERROR_INSUFFICIENT,
  RECOGNIZE_HOLD_MAX,
  TRYON_MODEL_TOTAL,
} from "@/constants/credits";
import type { CreditBalance, CreditCloudError } from "@/types/credits";

/** 积分不足时的统一提示文案 */
export const CREDITS_INSUFFICIENT_TOAST = "积分不足，请前往充值";

/** 积分充值页路径 */
export const CREDITS_RECHARGE_PAGE = "/pages/recharge/index";

/**
 * 判断云函数/服务返回是否为积分不足。
 */
export function isInsufficientCreditsPayload(
  payload: { error?: string; message?: string } | null | undefined
): boolean {
  if (!payload) return false;
  return payload.error === CREDITS_ERROR_INSUFFICIENT;
}

/**
 * 识别上传前本地预检：可用积分是否满足单次预占上限。
 */
export function canAffordRecognition(available: number): boolean {
  return available >= RECOGNIZE_HOLD_MAX;
}

/** 生成本人试穿模特前本地预检（按单次预占上限，即成功价 60） */
export function canAffordTryOnModel(available: number): boolean {
  return available >= TRYON_MODEL_TOTAL;
}

/**
 * 将积分相关错误转为用户可读 toast。
 */
export function resolveCreditsToastMessage(
  message: string,
  errorCode?: string
): string {
  if (
    errorCode === CREDITS_ERROR_INSUFFICIENT ||
    message.includes("积分不足")
  ) {
    return CREDITS_INSUFFICIENT_TOAST;
  }
  return message;
}

export function isCreditBalance(
  data: CreditBalance | CreditCloudError
): data is CreditBalance {
  return typeof (data as CreditBalance).available === "number";
}
