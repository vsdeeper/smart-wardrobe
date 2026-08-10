import { MINE_RECOGNITION_PREVIEW_LIMIT } from "@/constants/recognition";
import { type RecognitionBatch } from "@/types/recognition";

import { getCachedImageUrl } from "@/services/image-url-cache";

export interface RecognitionBatchPreviewStore {
  batches: RecognitionBatch[];
  totalCount: number;
  previewLimit: number;
}

export interface InitialRecognitionBatchPreview {
  batches: RecognitionBatch[];
  totalCount: number;
  hasCache: boolean;
}

let store: RecognitionBatchPreviewStore | null = null;

function withoutCoverUrl(batch: RecognitionBatch): RecognitionBatch {
  if (!batch.coverUrl) return batch;
  const next = { ...batch };
  delete next.coverUrl;
  return next;
}

function hydrateCoverUrls(batches: RecognitionBatch[]): RecognitionBatch[] {
  return batches.map((batch) => {
    if (!batch.coverFileId) {
      return { ...batch, coverUrl: undefined };
    }
    const url = getCachedImageUrl("recognition", batch.coverFileId);
    return {
      ...batch,
      coverUrl: url && url !== batch.coverFileId ? url : undefined,
    };
  });
}

export function readRecognitionBatchPreviewCache(): RecognitionBatchPreviewStore | null {
  return store;
}

export function writeRecognitionBatchPreviewCache(input: {
  batches: RecognitionBatch[];
  totalCount: number;
  previewLimit: number;
}): void {
  store = {
    batches: input.batches.map(withoutCoverUrl),
    totalCount: input.totalCount,
    previewLimit: input.previewLimit,
  };
}

/** 历史页首屏拉取后截断回写「我的」预览内存 */
export function syncRecognitionBatchPreviewFromList(
  batches: RecognitionBatch[],
  totalCount: number,
  previewLimit = MINE_RECOGNITION_PREVIEW_LIMIT,
): void {
  writeRecognitionBatchPreviewCache({
    batches: batches.slice(0, previewLimit),
    totalCount,
    previewLimit,
  });
}

export function clearRecognitionBatchPreviewCache(): void {
  store = null;
}

export function getInitialRecognitionBatchPreview(
  previewLimit = MINE_RECOGNITION_PREVIEW_LIMIT,
): InitialRecognitionBatchPreview {
  if (!store || store.previewLimit !== previewLimit) {
    return { batches: [], totalCount: 0, hasCache: false };
  }

  return {
    batches: hydrateCoverUrls(store.batches),
    totalCount: store.totalCount,
    hasCache: true,
  };
}
