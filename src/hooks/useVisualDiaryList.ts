import { useCallback, useRef, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { VISUAL_DIARY_PAGE_SIZE } from "@/data/tryOn";
import type { VisualDiaryEntry } from "@/data/tryOn";
import {
  deleteVisualDiaryEntry,
  fetchVisualDiaryEntries,
} from "@/services/visualDiary";

export function useVisualDiaryList() {
  const [entries, setEntries] = useState<VisualDiaryEntry[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadingRef = useRef(false);
  const entriesRef = useRef<VisualDiaryEntry[]>([]);
  entriesRef.current = entries;

  const loadEntries = useCallback(async (options: { reset?: boolean } = {}) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    const reset = options.reset ?? false;
    if (reset) {
      setInitialLoading(true);
    } else {
      setListLoading(true);
    }

    try {
      const skip = reset ? 0 : entriesRef.current.length;
      const nextEntries = await fetchVisualDiaryEntries({
        skip,
        limit: VISUAL_DIARY_PAGE_SIZE,
      });

      setEntries((prev) => (reset ? nextEntries : [...prev, ...nextEntries]));
      setHasMore(nextEntries.length >= VISUAL_DIARY_PAGE_SIZE);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "穿搭日记加载失败，请稍后重试";
      Taro.showToast({ title: message, icon: "none" });
    } finally {
      loadingRef.current = false;
      setListLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useDidShow(() => {
    loadingRef.current = false;
    void loadEntries({ reset: true });
  });

  const handleScrollToLower = useCallback(() => {
    if (!hasMore || listLoading || initialLoading || loadingRef.current) return;
    void loadEntries();
  }, [hasMore, initialLoading, listLoading, loadEntries]);

  const handleViewDetail = useCallback((id: string) => {
    Taro.navigateTo({ url: `/pages/visual-diary-detail/index?id=${id}` });
  }, []);

  const handleDelete = useCallback(
    async (id: string, title: string) => {
      if (deleting) return;

      const modalRes = await Taro.showModal({
        title: "确认删除",
        content: `确定要删除「${title}」吗？此操作不可恢复。`,
        confirmText: "删除",
        confirmColor: "#fa2c19",
      });

      if (!modalRes.confirm) return;

      setDeleting(true);
      try {
        await deleteVisualDiaryEntry(id);
        setEntries((prev) => {
          const next = prev.filter((entry) => entry._id !== id);
          if (next.length === 0 && hasMore) {
            loadingRef.current = false;
            void loadEntries({ reset: true });
          }
          return next;
        });
        Taro.showToast({ title: "已删除", icon: "success" });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "删除失败，请稍后重试";
        Taro.showToast({ title: message, icon: "none" });
      } finally {
        setDeleting(false);
      }
    },
    [deleting, hasMore, loadEntries],
  );

  return {
    entries,
    hasMore,
    initialLoading,
    listLoading,
    handleScrollToLower,
    handleViewDetail,
    handleDelete,
  };
}
