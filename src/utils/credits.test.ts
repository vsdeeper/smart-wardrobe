import { describe, expect, it } from "vitest";
import {
  CREDITS_ERROR_INSUFFICIENT,
  RECOGNIZE_HOLD_MAX,
  TRYON_MODEL_TOTAL,
} from "@/constants/credits";
import type { CreditBalance, CreditCloudError } from "@/types/credits";
import {
  CREDITS_INSUFFICIENT_TOAST,
  canAffordRecognition,
  canAffordTryOnModel,
  isCreditBalance,
  isInsufficientCreditsPayload,
  resolveCreditsToastMessage,
} from "./credits";

describe("canAffordRecognition", () => {
  it("可用积分达到预占上限时允许识别", () => {
    expect(canAffordRecognition(RECOGNIZE_HOLD_MAX)).toBe(true);
    expect(canAffordRecognition(RECOGNIZE_HOLD_MAX - 1)).toBe(false);
  });
});

describe("canAffordTryOnModel", () => {
  it("可用积分达到模特生成总价时允许", () => {
    expect(canAffordTryOnModel(TRYON_MODEL_TOTAL)).toBe(true);
    expect(canAffordTryOnModel(TRYON_MODEL_TOTAL - 1)).toBe(false);
  });
});

describe("isInsufficientCreditsPayload", () => {
  it("识别积分不足错误码", () => {
    expect(
      isInsufficientCreditsPayload({
        error: CREDITS_ERROR_INSUFFICIENT,
      }),
    ).toBe(true);
    expect(isInsufficientCreditsPayload(null)).toBe(false);
    expect(isInsufficientCreditsPayload({ error: "OTHER" })).toBe(false);
  });
});

describe("resolveCreditsToastMessage", () => {
  it("积分不足时返回统一 toast", () => {
    expect(
      resolveCreditsToastMessage("任意", CREDITS_ERROR_INSUFFICIENT),
    ).toBe(CREDITS_INSUFFICIENT_TOAST);
    expect(resolveCreditsToastMessage("积分不足，请充值")).toBe(
      CREDITS_INSUFFICIENT_TOAST,
    );
  });

  it("其他错误原样返回", () => {
    expect(resolveCreditsToastMessage("网络异常")).toBe("网络异常");
  });
});

describe("isCreditBalance", () => {
  it("区分余额摘要与云错误", () => {
    const balance: CreditBalance = {
      balance: 100,
      frozen: 0,
      available: 100,
    };
    const error: CreditCloudError = {
      error: CREDITS_ERROR_INSUFFICIENT,
      message: "积分不足",
    };
    expect(isCreditBalance(balance)).toBe(true);
    expect(isCreditBalance(error)).toBe(false);
  });
});
