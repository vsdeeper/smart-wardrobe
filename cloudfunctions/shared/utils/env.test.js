import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);

const { getEnv, requireEnv } = require("./env");

describe("getEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("缺失或空串返回 undefined", () => {
    vi.stubEnv("TEST_MISSING_VAR", "");
    expect(getEnv("TEST_MISSING_VAR")).toBeUndefined();
    expect(getEnv("NOT_SET_AT_ALL")).toBeUndefined();
  });

  it("有值时返回 trim 后的字符串", () => {
    vi.stubEnv("TEST_SET_VAR", "  hello  ");
    expect(getEnv("TEST_SET_VAR")).toBe("hello");
  });
});

describe("requireEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("缺失时抛 env 错误", () => {
    expect(() => requireEnv("TEST_REQUIRED_MISSING")).toThrow(
      "[env] 缺少必需环境变量 TEST_REQUIRED_MISSING"
    );
  });

  it("有值时返回环境变量", () => {
    vi.stubEnv("TEST_REQUIRED_OK", "value");
    expect(requireEnv("TEST_REQUIRED_OK")).toBe("value");
  });
});
