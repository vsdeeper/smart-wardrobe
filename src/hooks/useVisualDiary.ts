import { useCallback, useState } from "react";
import { useDidShow } from "@tarojs/taro";
import { MINE_DIARY_PREVIEW_LIMIT } from "@/data/tryOn";
import type { VisualDiaryEntry } from "@/data/tryOn";
import {
  fetchVisualDiaryCount,
  fetchVisualDiaryEntries,
} from "@/services/visualDiary";

interface UseVisualDiaryOptions {
  previewLimit?: number;
}

export function useVisualDiary(options: UseVisualDiaryOptions = {}) {
  const previewLimit = options.previewLimit ?? MINE_DIARY_PREVIEW_LIMIT;
  const [entries, setEntries] = useState<VisualDiaryEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [data, count] = await Promise.all([
        fetchVisualDiaryEntries({ limit: previewLimit }),
        fetchVisualDiaryCount(),
      ]);
      setEntries(data);
      setTotalCount(count);
    } catch {
      setEntries([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [previewLimit]);

  useDidShow(() => {
    refresh();
  });

  return { entries, totalCount, loading, refresh };
}
