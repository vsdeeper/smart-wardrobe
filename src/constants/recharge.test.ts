import { describe, expect, it } from "vitest";
import {
  RECHARGE_MAX_FEN,
  RECHARGE_MIN_FEN,
} from "./recharge";

const cloudRecharge = require("../../cloudfunctions/shared/constants/recharge.js");

describe("前后端充值常量对齐", () => {
  it("金额上下限与云函数 shared 一致", () => {
    expect(RECHARGE_MIN_FEN).toBe(cloudRecharge.RECHARGE_MIN_FEN);
    expect(RECHARGE_MAX_FEN).toBe(cloudRecharge.RECHARGE_MAX_FEN);
  });
});
