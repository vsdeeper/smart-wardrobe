import { useCallback, useRef, useState } from "react";
import Taro from "@tarojs/taro";
import type { TryOnRecommendation } from "@/data/tryOn";
import type { WeatherSnapshot } from "@/data/weather";
import type { WardrobeItem } from "@/data/wardrobe";
import {
  getInitialTryOnCache,
  writeTryOnCache,
} from "@/services/tryOnCache";
import { saveVisualDiaryEntry } from "@/services/visualDiary";

interface UseTryOnWearOptions {
  recommendation: TryOnRecommendation | null;
  selectedPieces: WardrobeItem[];
  heroCoverFileId: string | null;
  weatherSnapshot: WeatherSnapshot | null;
}

function getOutfitKey(
  selectedPieces: WardrobeItem[],
  heroCoverFileId: string | null,
): string {
  return `${heroCoverFileId ?? ""}:${selectedPieces.map((piece) => piece._id).join(",")}`;
}

export function useTryOnWear({
  recommendation,
  selectedPieces,
  heroCoverFileId,
  weatherSnapshot,
}: UseTryOnWearOptions) {
  const [saving, setSaving] = useState(false);
  const outfitKey = getOutfitKey(selectedPieces, heroCoverFileId);
  const [confirmedOutfitKey, setConfirmedOutfitKey] = useState(() => {
    const cache = getInitialTryOnCache();
    return cache?.wearConfirmed
      ? getOutfitKey(
          cache.selectedPieces,
          cache.heroCoverFileId ?? null,
        )
      : null;
  });
  const savingRef = useRef(false);
  const wearConfirmed =
    confirmedOutfitKey === outfitKey &&
    getInitialTryOnCache()?.wearConfirmed === true;

  const handleWearOutfit = useCallback(async () => {
    if (savingRef.current || wearConfirmed) return;

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

      const cache = getInitialTryOnCache();
      writeTryOnCache(
        {
          recommendation: recommendation ?? {
            outfitName: "今日搭配",
            description: "",
            slots: [],
            tips: [],
          },
          selectedPieces,
          heroCoverFileId,
          weatherSnapshot: weatherSnapshot ?? undefined,
          wearConfirmed: true,
        },
        { clearHero: cache?.heroCoverFileId !== heroCoverFileId },
      );
      setConfirmedOutfitKey(outfitKey);
      Taro.showToast({ title: "已记录到视觉日记", icon: "success" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "保存失败，请稍后重试";
      Taro.showToast({ title: message, icon: "none" });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [
    recommendation,
    selectedPieces,
    heroCoverFileId,
    weatherSnapshot,
    outfitKey,
    wearConfirmed,
  ]);

  return { saving, wearConfirmed, handleWearOutfit };
}
