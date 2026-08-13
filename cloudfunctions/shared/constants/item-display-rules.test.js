import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

const {
  DISPLAY_IMAGE_MAX_COUNT,
  buildItemTypeConstraints,
  selectItemsForDisplayGeneration,
  buildItemsDisplayPrompt,
} = require("./item-display-rules");

const sampleItem = {
  typeName: "上装",
  name: "圆领短袖T恤",
  tags: ["白色", "夏季"],
};

describe("selectItemsForDisplayGeneration", () => {
  it("空列表抛错", () => {
    expect(() => selectItemsForDisplayGeneration([])).toThrow(
      "缺少待生成展示图的单品列表"
    );
  });

  it("多于 DISPLAY_IMAGE_MAX_COUNT 只取第一件", () => {
    const items = [sampleItem, { ...sampleItem, name: "第二件" }];
    const selected = selectItemsForDisplayGeneration(items);
    expect(selected).toHaveLength(DISPLAY_IMAGE_MAX_COUNT);
    expect(selected[0].name).toBe("圆领短袖T恤");
  });
});

describe("buildItemTypeConstraints", () => {
  it("已知品类含 include/exclude", () => {
    const text = buildItemTypeConstraints("上装");
    expect(text).toContain("画面应含");
    expect(text).toContain("T恤");
    expect(text).toContain("禁止");
  });

  it("未知品类走其他", () => {
    const text = buildItemTypeConstraints("未知品类");
    expect(text).toContain("仅识别出的那件单品");
  });
});

describe("buildItemsDisplayPrompt", () => {
  it("hasBgRef 为 true 时含图1/图2", () => {
    const prompt = buildItemsDisplayPrompt([sampleItem], { hasBgRef: true });
    expect(prompt).toContain("图1");
    expect(prompt).toContain("图2");
    expect(prompt).toContain("<items>");
  });

  it("hasBgRef 为 false 时含目录风 fallback 文案", () => {
    const prompt = buildItemsDisplayPrompt([sampleItem], { hasBgRef: false });
    expect(prompt).toContain("目录风产品展示图");
    expect(prompt).toContain("<items>");
    expect(prompt).not.toContain("图2");
  });
});
