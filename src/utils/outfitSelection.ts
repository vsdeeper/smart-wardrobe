import type { WardrobeItem } from "@/data/wardrobe";

export function getPieceIds(pieces: WardrobeItem[]): string[] {
  return [...pieces.map((p) => p._id)].sort();
}

export function arePieceSelectionsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
}

export function piecesFromIds(
  ids: string[],
  pool: WardrobeItem[],
): WardrobeItem[] {
  const map = new Map(pool.map((item) => [item._id, item]));
  return ids.map((id) => map.get(id)).filter((item): item is WardrobeItem =>
    Boolean(item),
  );
}
