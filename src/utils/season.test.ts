import { describe, expect, it } from "vitest";
import { getCurrentSeason, getDateKey } from "./season";

describe("getCurrentSeason", () => {
  it("3–5 月为春", () => {
    expect(getCurrentSeason(new Date(2026, 2, 1))).toBe("春");
    expect(getCurrentSeason(new Date(2026, 4, 31))).toBe("春");
  });

  it("6–8 月为夏", () => {
    expect(getCurrentSeason(new Date(2026, 5, 1))).toBe("夏");
    expect(getCurrentSeason(new Date(2026, 7, 31))).toBe("夏");
  });

  it("9–11 月为秋", () => {
    expect(getCurrentSeason(new Date(2026, 8, 1))).toBe("秋");
    expect(getCurrentSeason(new Date(2026, 10, 30))).toBe("秋");
  });

  it("12–2 月为冬", () => {
    expect(getCurrentSeason(new Date(2026, 11, 1))).toBe("冬");
    expect(getCurrentSeason(new Date(2026, 0, 15))).toBe("冬");
    expect(getCurrentSeason(new Date(2026, 1, 28))).toBe("冬");
  });
});

describe("getDateKey", () => {
  it("格式化为 YYYY-MM-DD 并零填充", () => {
    expect(getDateKey(new Date(2026, 7, 13))).toBe("2026-08-13");
    expect(getDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
