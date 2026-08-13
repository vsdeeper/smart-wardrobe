import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockCloud } from "../test-helpers/mock-cloud.js";

const require = createRequire(import.meta.url);

const {
  buildCloudPath,
  uploadGeneratedImageToCloud,
  uploadUrlToCloud,
} = require("./upload-generated-image");

describe("buildCloudPath", () => {
  it("生成 prefix/openid/ 路径", () => {
    const path = buildCloudPath("wardrobe/items", "user-1");
    expect(path).toMatch(/^wardrobe\/items\/user-1\/\d+$/);
  });

  it("带 index 时后缀含 index", () => {
    const path = buildCloudPath("generated", "user-1", 2);
    expect(path).toMatch(/^generated\/user-1\/\d+-2$/);
  });
});

describe("uploadGeneratedImageToCloud", () => {
  it("b64 走 base64 上传路径", async () => {
    const cloud = createMockCloud({ uploadFileId: "cloud://b64.png" });
    const fileId = await uploadGeneratedImageToCloud(
      cloud,
      { b64: "iVBORw0KGgo=" },
      { prefix: "generated", openid: "user-1", index: 0 }
    );
    expect(fileId).toBe("cloud://b64.png");
  });

  it("url 走 fetch 下载后上传", async () => {
    const cloud = createMockCloud({ uploadFileId: "cloud://url.png" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "image/png" },
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    vi.stubGlobal("fetch", fetchMock);

    const fileId = await uploadGeneratedImageToCloud(
      cloud,
      { url: "https://example.com/img.png" },
      { prefix: "generated", openid: "user-1" }
    );

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/img.png");
    expect(fileId).toBe("cloud://url.png");

    vi.unstubAllGlobals();
  });
});

describe("uploadUrlToCloud", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("HTTP 200 时上传并返回 fileID", async () => {
    const cloud = createMockCloud({ uploadFileId: "cloud://ok.png" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () => new Uint8Array([1]).buffer,
      })
    );

    const fileId = await uploadUrlToCloud(
      cloud,
      "https://example.com/a.jpg",
      "custom/path.jpg"
    );
    expect(fileId).toBe("cloud://ok.png");
  });

  it("HTTP 非 200 时抛错", async () => {
    const cloud = createMockCloud();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
    );

    await expect(
      uploadUrlToCloud(cloud, "https://example.com/missing.png")
    ).rejects.toThrow("下载生成图失败 HTTP 404");
  });
});
