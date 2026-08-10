import { VisualDiaryEntry } from "@/types/try-on";
import { MINE_DIARY_PREVIEW_LIMIT } from "@/constants/try-on";
import { useCallback, useState } from "react";
import { useDidShow } from "@tarojs/taro";


import {
  fetchVisualDiaryCount,
  fetchVisualDiaryEntries,
} from "@/services/visual-diary";
import {
  getInitialVisualDiaryPreview,
  readVisualDiaryPreviewCache,
  writeVisualDiaryPreviewCache,
} from "@/services/visual-diary-cache";

interface UseVisualDiaryOptions {
  previewLimit?: number;
}

export function useVisualDiary(options: UseVisualDiaryOptions = {}) {
  const previewLimit = options.previewLimit ?? MINE_DIARY_PREVIEW_LIMIT;
  const initial = getInitialVisualDiaryPreview(previewLimit);
  const [entries, setEntries] = useState<VisualDiaryEntry[]>(initial.entries);
  const [totalCount, setTotalCount] = useState(initial.totalCount);
  const [loading, setLoading] = useState(!initial.hasCache);

  const refresh = useCallback(async () => {
    const cached = readVisualDiaryPreviewCache();
    const hasCache = !!cached && cached.previewLimit === previewLimit;
    if (!hasCache) {
      setLoading(true);
    }

    try {
      const [data, count] = await Promise.all([
        fetchVisualDiaryEntries({ limit: previewLimit }),
        fetchVisualDiaryCount(),
      ]);
      writeVisualDiaryPreviewCache({
        entries: data,
        totalCount: count,
        previewLimit,
      });
      setEntries(data);
      setTotalCount(count);
    } catch {
      if (!hasCache) {
        setEntries([]);
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, [previewLimit]);

  useDidShow(() => {
    void refresh();
  });

  return { entries, totalCount, loading, refresh };
}
