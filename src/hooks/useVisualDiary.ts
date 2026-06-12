import { useCallback, useState } from "react";
import { useDidShow } from "@tarojs/taro";
import type { VisualDiaryEntry } from "@/data/tryOn";
import { fetchVisualDiaryEntries } from "@/services/visualDiary";

export function useVisualDiary() {
  const [entries, setEntries] = useState<VisualDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchVisualDiaryEntries();
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useDidShow(() => {
    refresh();
  });

  return { entries, loading, refresh };
}
