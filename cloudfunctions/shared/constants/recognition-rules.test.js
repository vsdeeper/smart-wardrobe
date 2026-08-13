import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

const {
  RECOGNITION_LIMITS,
  parseRecognitionContent,
  parseRecognitionResult,
  parseRecognitionItems,
  filterItemsByUserGender,
} = require("./recognition-rules");

const sampleItem = {
  typeName: "上装",
  name: "圆领短袖T恤",
  tags: ["白色", "夏季"],
  audienceGender: "unisex",
  stylingAdvice: "休闲百搭",
};

describe("parseRecognitionContent", () => {
  it("解析合法 JSON items", () => {
    const content = JSON.stringify({ items: [sampleItem] });
    const items = parseRecognitionContent(content);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("圆领短袖T恤");
  });

  it("支持 ```json 代码块包裹", () => {
    const content = `\`\`\`json\n${JSON.stringify({ items: [sampleItem] })}\n\`\`\``;
    const items = parseRecognitionContent(content);
    expect(items[0].typeName).toBe("上装");
  });

  it("从嵌套说明文字中提取 JSON 对象", () => {
    const json = JSON.stringify({ items: [sampleItem] });
    const content = `以下是识别结果：\n${json}\n请查收。`;
    const items = parseRecognitionContent(content);
    expect(items[0].name).toBe("圆领短袖T恤");
  });

  it("空内容或非法 JSON 抛错", () => {
    expect(() => parseRecognitionContent("")).toThrow();
    expect(() => parseRecognitionContent("not json")).toThrow();
  });
});

describe("parseRecognitionItems", () => {
  it("空 items 抛未识别", () => {
    expect(() => parseRecognitionItems({ items: [] })).toThrow(
      "未识别到衣物单品"
    );
  });

  it("超出 maxItems 时截断", () => {
    const items = Array.from(
      { length: RECOGNITION_LIMITS.maxItems + 2 },
      (_, i) => ({
        typeName: "上装",
        name: `单品${i}`,
        tags: ["白色", "夏季"],
      })
    );
    const parsed = parseRecognitionItems({ items });
    expect(parsed).toHaveLength(RECOGNITION_LIMITS.maxItems);
    expect(parsed[0].name).toBe("单品0");
  });

  it("单对象 { typeName, name } 兼容为 items 数组", () => {
    const parsed = parseRecognitionItems({
      typeName: "下装",
      name: "牛仔裤",
      tags: ["蓝色", "四季"],
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0].typeName).toBe("下装");
  });
});

describe("parseRecognitionResult", () => {
  it("缺必要字段抛错", () => {
    expect(() => parseRecognitionResult({ typeName: "上装" })).toThrow(
      "AI 返回缺少必要字段"
    );
  });

  it("非法 audienceGender 归 unisex", () => {
    const result = parseRecognitionResult({
      typeName: "上装",
      name: "T恤",
      audienceGender: "unknown",
    });
    expect(result.audienceGender).toBe("unisex");
  });
});

describe("filterItemsByUserGender", () => {
  const items = [
    { ...sampleItem, audienceGender: "male" },
    { ...sampleItem, name: "连衣裙", audienceGender: "female" },
    { ...sampleItem, name: "卫衣", audienceGender: "unisex" },
  ];

  it("male 用户过滤 female 单品并移除 audienceGender", () => {
    const { items: filtered, filteredCount } = filterItemsByUserGender(
      items,
      "male"
    );
    expect(filteredCount).toBe(1);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((item) => !("audienceGender" in item))).toBe(true);
    expect(filtered.some((item) => item.name === "连衣裙")).toBe(false);
  });

  it("未知 gender 不过滤", () => {
    const { items: filtered, filteredCount } = filterItemsByUserGender(
      items,
      "other"
    );
    expect(filteredCount).toBe(0);
    expect(filtered).toHaveLength(3);
  });
});
