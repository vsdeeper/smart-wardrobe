import { WardrobeItem } from "@/types/wardrobe";
import { VisualDiaryEntry } from "@/types/try-on";
import { useCallback, useState } from "react";
import Taro, { useDidShow, useRouter } from "@tarojs/taro";

import { fetchWardrobeItemsByIds } from "@/services/wardrobe";
import { fetchVisualDiaryEntryById } from "@/services/visual-diary";
import { toUserMessage } from "@/utils/error-message";

export function useVisualDiaryDetail() {
  const router = useRouter();
  const entryId = router.params.id ?? "";

  const [entry, setEntry] = useState<VisualDiaryEntry | null>(null);
  const [pieces, setPieces] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!entryId) {
      setError("暂时打不开这条穿搭记录，请返回重试");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const diaryEntry = await fetchVisualDiaryEntryById(entryId);
      const wardrobePieces = await fetchWardrobeItemsByIds(diaryEntry.pieceIds);
      setEntry(diaryEntry);
      setPieces(wardrobePieces);
    } catch (err) {
      const message = toUserMessage(err, "穿搭记录加载失败，请稍后重试");
      setError(message);
      setEntry(null);
      setPieces([]);
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useDidShow(() => {
    void loadDetail();
  });

  const handleBack = useCallback(() => {
    Taro.navigateBack();
  }, []);

  const handlePieceClick = useCallback((pieceId: string) => {
    Taro.navigateTo({ url: `/pages/wardrobe-detail/index?id=${pieceId}` });
  }, []);

  return {
    entry,
    pieces,
    loading,
    error,
    handleBack,
    handlePieceClick,
  };
}
