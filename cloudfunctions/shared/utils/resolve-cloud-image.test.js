import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { createMockCloud } from "../test-helpers/mock-cloud.js";

const require = createRequire(import.meta.url);

const { resolveImageUrl, resolveImageUrls } = require("./resolve-cloud-image");

describe("resolveImageUrl", () => {
  it("status 为 0 时返回临时 URL", async () => {
    const cloud = createMockCloud({
      tempUrls: { "cloud://a": "https://cdn.example/a.jpg" },
    });
    const url = await resolveImageUrl(cloud, "cloud://a");
    expect(url).toBe("https://cdn.example/a.jpg");
  });

  it("解析失败时抛错", async () => {
    const cloud = createMockCloud({ failedFileIds: ["cloud://bad"] });
    await expect(resolveImageUrl(cloud, "cloud://bad")).rejects.toThrow(
      "无法获取图片临时链接"
    );
  });
});

describe("resolveImageUrls", () => {
  it("去重、过滤失败项并保序", async () => {
    const cloud = createMockCloud({
      tempUrls: {
        "cloud://a": "https://cdn.example/a.jpg",
        "cloud://b": "https://cdn.example/b.jpg",
      },
      failedFileIds: ["cloud://bad"],
    });

    const urls = await resolveImageUrls(cloud, [
      "cloud://a",
      "cloud://bad",
      "cloud://a",
      "cloud://b",
    ]);

    expect(urls).toEqual([
      "https://cdn.example/a.jpg",
      "https://cdn.example/b.jpg",
    ]);
  });
});
