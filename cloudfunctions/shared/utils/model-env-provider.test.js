import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 回归：model-env 的 chat/images 适配器须惰性加载（在调用函数内 require）。
 * 各云函数按自身所需只同步对应 provider（chat-only 不打包 images.js，反之亦然），
 * 若急切在顶层 require，缺失适配器的函数会在部署时即崩（Cannot find module '../providers/ark/...'）。
 * 本文件通过 Node require.cache 断言 provider 未被急切加载；桩 provider 导出以验证委托且不触网。
 */
const require = createRequire(import.meta.url);

const CHAT_PATH = require.resolve("../../providers/ark/chat");
const IMAGES_PATH = require.resolve("../../providers/ark/images");
const MODEL_ENV_PATH = require.resolve("./model-env");

function clearCjsCache() {
  delete require.cache[MODEL_ENV_PATH];
  delete require.cache[CHAT_PATH];
  delete require.cache[IMAGES_PATH];
}

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

describe("model-env provider 惰性加载", () => {
  beforeEach(() => {
    clearCjsCache();
  });

  afterEach(() => {
    clearCjsCache();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("require model-env 不会急切加载任何 provider", () => {
    require(MODEL_ENV_PATH);
    expect(require.cache[CHAT_PATH]).toBeUndefined();
    expect(require.cache[IMAGES_PATH]).toBeUndefined();
  });

  it("chatCompletions 委托 chat 适配器，且不加载 images", async () => {
    stubModelEnv();
    const modelEnv = require(MODEL_ENV_PATH);
    const chat = require(CHAT_PATH);
    const chatSpy = vi.spyOn(chat, "chatCompletions").mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
    });

    await modelEnv.chatCompletions({ messages: [] });

    expect(chatSpy).toHaveBeenCalledTimes(1);
    expect(require.cache[IMAGES_PATH]).toBeUndefined();
  });

  it("generateImages 委托 images 适配器，且不加载 chat", async () => {
    stubModelEnv();
    const modelEnv = require(MODEL_ENV_PATH);
    const images = require(IMAGES_PATH);
    const imagesSpy = vi.spyOn(images, "generateImages").mockResolvedValue({
      images: [],
    });

    await modelEnv.generateImages({ prompt: "测试图片" });

    expect(imagesSpy).toHaveBeenCalledTimes(1);
    expect(require.cache[CHAT_PATH]).toBeUndefined();
  });
});
