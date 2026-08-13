import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockCloud } from "../test-helpers/mock-cloud.js";

const require = createRequire(import.meta.url);

const arkImages = require("../../providers/ark/images");
const {
  buildPreviewFromItem,
  mergePreviews,
  generateDisplayImages,
} = require("./wardrobe-display-pipeline");

const sampleItem = {
  typeName: "上装",
  name: "圆领短袖T恤",
  tags: ["白色", "夏季"],
  stylingAdvice: "休闲百搭",
};

function stubModelEnv() {
  vi.stubEnv("MODEL_API_KEY", "test-api-key");
  vi.stubEnv("MODEL_API_BASE_URL", "https://api.example.com");
  vi.stubEnv("CHAT_MODEL", "test-chat-model");
  vi.stubEnv("IMAGE_MODEL", "test-image-model");
}

describe("buildPreviewFromItem", () => {
  it("映射字段到 preview", () => {
    const preview = buildPreviewFromItem(sampleItem, "cloud://file-1");
    expect(preview).toEqual({
      name: "圆领短袖T恤",
      typeName: "上装",
      tags: ["白色", "夏季"],
      imageFileId: "cloud://file-1",
      stylingAdvice: "休闲百搭",
    });
  });

  it("includeTempId 为 true 时含 tempId", () => {
    const preview = buildPreviewFromItem(sampleItem, "cloud://file-1", {
      includeTempId: true,
    });
    expect(preview.tempId).toBeTruthy();
  });
});

describe("mergePreviews", () => {
  it("缺失 fileId 时写入 failed 且不重复", () => {
    const displayItems = [sampleItem];
    const imageFileIds = [null];
    const partialFailed = [{ index: 0, message: "已有错误" }];

    const { previews, failed } = mergePreviews(
      displayItems,
      imageFileIds,
      partialFailed
    );

    expect(previews).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0].message).toBe("已有错误");
  });

  it("成功项合并为 preview", () => {
    const { previews, failed } = mergePreviews(
      [sampleItem],
      ["cloud://ok"],
      []
    );
    expect(previews).toHaveLength(1);
    expect(previews[0].imageFileId).toBe("cloud://ok");
    expect(failed).toHaveLength(0);
  });
});

describe("generateDisplayImages", () => {
  beforeEach(() => {
    stubModelEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("生图成功时返回 fileID", async () => {
    vi.spyOn(arkImages, "generateImages").mockResolvedValue({
      images: [{ b64: "abc123", url: null }],
    });

    const cloud = createMockCloud({ uploadFileId: "cloud://generated-1" });
    const result = await generateDisplayImages(
      cloud,
      [sampleItem],
      "https://source.example/img.jpg",
      "openid-1"
    );

    expect(result.displayItems).toHaveLength(1);
    expect(result.imageFileIds).toEqual(["cloud://generated-1"]);
    expect(result.failed).toHaveLength(0);
  });

  it("生图失败时记录 failed 且 imageFileIds 为 null", async () => {
    vi.spyOn(arkImages, "generateImages").mockResolvedValue({ images: [] });

    const cloud = createMockCloud();
    const result = await generateDisplayImages(
      cloud,
      [sampleItem],
      "https://source.example/img.jpg",
      "openid-1"
    );

    expect(result.imageFileIds).toEqual([null]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].message).toBe("展示图生成缺失");
  });
});
