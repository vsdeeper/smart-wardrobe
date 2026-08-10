import { MINE_DIARY_PREVIEW_LIMIT } from "@/constants/try-on";
import { type VisualDiaryEntry } from "@/types/try-on";

import { getCachedImageUrl } from "@/services/image-url-cache";

export interface VisualDiaryPreviewStore {
  entries: VisualDiaryEntry[];
  totalCount: number;
  previewLimit: number;
}

export interface InitialVisualDiaryPreview {
  entries: VisualDiaryEntry[];
  totalCount: number;
  hasCache: boolean;
}

let store: VisualDiaryPreviewStore | null = null;

function withoutCoverUrl(entry: VisualDiaryEntry): VisualDiaryEntry {
  if (!entry.coverUrl) return entry;
  const next = { ...entry };
  delete next.coverUrl;
  return next;
}

function hydrateCoverUrls(entries: VisualDiaryEntry[]): VisualDiaryEntry[] {
  return entries.map((entry) => {
    if (!entry.coverFileId) {
      return { ...entry, coverUrl: undefined };
    }
    const url = getCachedImageUrl("visualDiary", entry.coverFileId);
    return {
      ...entry,
      coverUrl: url && url !== entry.coverFileId ? url : undefined,
    };
  });
}

export function readVisualDiaryPreviewCache(): VisualDiaryPreviewStore | null {
  return store;
}

export function writeVisualDiaryPreviewCache(input: {
  entries: VisualDiaryEntry[];
  totalCount: number;
  previewLimit: number;
}): void {
  store = {
    entries: input.entries.map(withoutCoverUrl),
    totalCount: input.totalCount,
    previewLimit: input.previewLimit,
  };
}

/** 列表页拉取后截断回写「我的」预览内存 */
export function syncVisualDiaryPreviewFromList(
  entries: VisualDiaryEntry[],
  previewLimit = MINE_DIARY_PREVIEW_LIMIT,
): void {
  const prev = store;
  writeVisualDiaryPreviewCache({
    entries: entries.slice(0, previewLimit),
    totalCount: Math.max(prev?.totalCount ?? 0, entries.length),
    previewLimit,
  });
}

export function clearVisualDiaryPreviewCache(): void {
  store = null;
}

export function getInitialVisualDiaryPreview(
  previewLimit = MINE_DIARY_PREVIEW_LIMIT,
): InitialVisualDiaryPreview {
  if (!store || store.previewLimit !== previewLimit) {
    return { entries: [], totalCount: 0, hasCache: false };
  }

  return {
    entries: hydrateCoverUrls(store.entries),
    totalCount: store.totalCount,
    hasCache: true,
  };
}
