import { describe, expect, it } from "vitest";
import type { WardrobeItem } from "@/types/wardrobe";
import {
  arePieceSelectionsEqual,
  getPieceIds,
  piecesFromIds,
} from "./outfit-selection";

function item(id: string): WardrobeItem {
  return {
    _id: id,
    name: id,
    typeId: "type-1",
    typeName: "上装",
    imageFileId: "file-1",
    createdAt: 0,
  };
}

describe("getPieceIds", () => {
  it("返回按 _id 排序的 id 列表", () => {
    expect(getPieceIds([item("c"), item("a"), item("b")])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("arePieceSelectionsEqual", () => {
  it("长度不同则不相等", () => {
    expect(arePieceSelectionsEqual(["a"], ["a", "b"])).toBe(false);
  });

  it("忽略顺序比较集合", () => {
    expect(arePieceSelectionsEqual(["b", "a"], ["a", "b"])).toBe(true);
  });
});

describe("piecesFromIds", () => {
  it("按 ids 顺序返回单品并丢弃缺失 id", () => {
    const pool = [item("a"), item("b"), item("c")];
    expect(piecesFromIds(["c", "a", "missing"], pool)).toEqual([
      item("c"),
      item("a"),
    ]);
  });
});
