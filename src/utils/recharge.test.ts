import { describe, expect, it } from "vitest";
import {
  RECHARGE_MAX_FEN,
  RECHARGE_MIN_FEN,
} from "@/constants/recharge";
import { formatFenToYuanLabel, parseYuanToFen } from "./recharge";

describe("parseYuanToFen", () => {
  it("有效元字符串转为分", () => {
    expect(parseYuanToFen("1")).toBe(100);
    expect(parseYuanToFen("6.5")).toBe(650);
    expect(parseYuanToFen("200")).toBe(20000);
  });

  it("无效输入返回 null", () => {
    expect(parseYuanToFen("")).toBeNull();
    expect(parseYuanToFen("abc")).toBeNull();
    expect(parseYuanToFen("1.234")).toBeNull();
    expect(parseYuanToFen("0")).toBeNull();
  });
});

describe("formatFenToYuanLabel", () => {
  it("分转元展示", () => {
    expect(formatFenToYuanLabel(RECHARGE_MIN_FEN)).toBe("1");
    expect(formatFenToYuanLabel(RECHARGE_MAX_FEN)).toBe("200");
    expect(formatFenToYuanLabel(650)).toBe("6.5");
  });
});
