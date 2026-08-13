import { describe, expect, it } from "vitest";
import { isValidMetric, parseMetricValue } from "./profile-field-validation";

describe("parseMetricValue", () => {
  it("空串或空白返回 null", () => {
    expect(parseMetricValue("")).toBeNull();
    expect(parseMetricValue("   ")).toBeNull();
  });

  it("非整数或非法数字返回 null", () => {
    expect(parseMetricValue("abc")).toBeNull();
    expect(parseMetricValue("170.5")).toBeNull();
    expect(parseMetricValue("NaN")).toBeNull();
  });

  it("合法整数返回数值", () => {
    expect(parseMetricValue("  175  ")).toBe(175);
  });
});

describe("isValidMetric", () => {
  it("身高 100–250 边界", () => {
    expect(isValidMetric("height", 99)).toBe(false);
    expect(isValidMetric("height", 100)).toBe(true);
    expect(isValidMetric("height", 250)).toBe(true);
    expect(isValidMetric("height", 251)).toBe(false);
  });

  it("体重 30–200 边界", () => {
    expect(isValidMetric("weight", 29)).toBe(false);
    expect(isValidMetric("weight", 30)).toBe(true);
    expect(isValidMetric("weight", 200)).toBe(true);
    expect(isValidMetric("weight", 201)).toBe(false);
  });
});
