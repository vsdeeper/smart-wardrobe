import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);

const {
  getModelProvider,
  getModelApiKey,
  getChatModel,
  getImageModel,
} = require("./model-env");

function stubModelEnv(overrides = {}) {
  const defaults = {
    MODEL_PROVIDER: undefined,
    MODEL_API_KEY: "test-key",
    MODEL_API_BASE_URL: "https://api.example.com",
    CHAT_MODEL: "chat-model",
    IMAGE_MODEL: "image-model",
  };
  const env = { ...defaults, ...overrides };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      vi.stubEnv(key, "");
    } else {
      vi.stubEnv(key, value);
    }
  }
}

describe("getModelProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("缺省 MODEL_PROVIDER 时为 ark", () => {
    stubModelEnv({ MODEL_PROVIDER: undefined });
    expect(getModelProvider()).toBe("ark");
  });

  it("非 ark 供应商抛百炼未接入", () => {
    stubModelEnv({ MODEL_PROVIDER: "bailian" });
    expect(() => getModelProvider()).toThrow("百炼尚未接入");
  });
});

describe("getModelApiKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("缺 MODEL_API_KEY 时抛错", () => {
    stubModelEnv({ MODEL_API_KEY: undefined });
    expect(() => getModelApiKey()).toThrow("未配置 MODEL_API_KEY");
  });
});

describe("getChatModel", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("缺 CHAT_MODEL 时抛错", () => {
    stubModelEnv({ CHAT_MODEL: undefined });
    expect(() => getChatModel()).toThrow("未配置 CHAT_MODEL");
  });
});

describe("getImageModel", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("缺 IMAGE_MODEL 时抛错", () => {
    stubModelEnv({ IMAGE_MODEL: undefined });
    expect(() => getImageModel()).toThrow("未配置 IMAGE_MODEL");
  });
});
