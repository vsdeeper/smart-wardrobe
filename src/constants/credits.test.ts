import { describe, expect, it } from "vitest";
import {
  BASE_FEE,
  CREDITS_ERROR_INSUFFICIENT,
  IMAGE_FEE,
  INITIAL_GRANT,
  OUTFIT_TOTAL,
  RECOGNIZE_HOLD_MAX,
  TRYON_MODEL_TOTAL,
} from "./credits";

const cloudCredits = require("../../cloudfunctions/shared/constants/credits.js");

describe("前后端积分常量对齐", () => {
  it("费用与首赠与云函数 shared 一致", () => {
    expect(INITIAL_GRANT).toBe(cloudCredits.INITIAL_GRANT);
    expect(BASE_FEE).toBe(cloudCredits.BASE_FEE);
    expect(IMAGE_FEE).toBe(cloudCredits.IMAGE_FEE);
    expect(RECOGNIZE_HOLD_MAX).toBe(cloudCredits.RECOGNIZE_HOLD_MAX);
    expect(TRYON_MODEL_TOTAL).toBe(cloudCredits.TRYON_MODEL_TOTAL);
    expect(OUTFIT_TOTAL).toBe(cloudCredits.OUTFIT_TOTAL);
    expect(CREDITS_ERROR_INSUFFICIENT).toBe(cloudCredits.ERROR_INSUFFICIENT);
  });
});
