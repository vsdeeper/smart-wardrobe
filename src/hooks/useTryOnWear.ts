import { useCallback, useRef, useState } from "react";
import Taro from "@tarojs/taro";
import type { TryOnRecommendation } from "@/data/tryOn";
import type { WeatherSnapshot } from "@/data/weather";
import type { WardrobeItem } from "@/data/wardrobe";
import { saveVisualDiaryEntry } from "@/services/visualDiary";
import { afterToastNavigate } from "@/utils/afterToastNavigate";

interface UseTryOnWearOptions {
  recommendation: TryOnRecommendation | null;
  selectedPieces: WardrobeItem[];
  heroCoverFileId: string | null;
  weatherSnapshot: WeatherSnapshot | null;
}

export function useTryOnWear({
  recommendation,
  selectedPieces,
  heroCoverFileId,
  weatherSnapshot,
}: UseTryOnWearOptions) {
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const handleWearOutfit = useCallback(async () => {
    if (savingRef.current) return;

    if (selectedPieces.length === 0) {
      Taro.showToast({ title: "请先选择单品", icon: "none" });
      return;
    }

    if (!heroCoverFileId) {
      Taro.showToast({ title: "效果图生成中，请稍候", icon: "none" });
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      await saveVisualDiaryEntry({
        title: recommendation?.outfitName ?? "今日搭配",
        description: recommendation?.description ?? "",
        coverFileId: heroCoverFileId,
        pieceIds: selectedPieces.map((p) => p._id),
        tips: recommendation?.tips ?? [],
        weatherSnapshot: weatherSnapshot ?? undefined,
      });

      Taro.showToast({ title: "已记录到视觉日记", icon: "success" });
      afterToastNavigate(() => {
        Taro.redirectTo({ url: "/pages/mine/index" });
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "保存失败，请稍后重试";
      Taro.showToast({ title: message, icon: "none" });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [recommendation, selectedPieces, heroCoverFileId, weatherSnapshot]);

  return { saving, handleWearOutfit };
}
