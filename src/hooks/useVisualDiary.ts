import { useCallback, useState } from "react";
import { useDidShow } from "@tarojs/taro";
import { MINE_DIARY_PREVIEW_LIMIT } from "@/data/tryOn";
import type { VisualDiaryEntry } from "@/data/tryOn";
import {
  fetchVisualDiaryCount,
  fetchVisualDiaryEntries,
} from "@/services/visualDiary";
import {
  getInitialVisualDiaryPreview,
  readVisualDiaryPreviewCache,
  writeVisualDiaryPreviewCache,
} from "@/services/visualDiaryCache";

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
