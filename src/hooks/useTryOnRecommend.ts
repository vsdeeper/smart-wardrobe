import { useCallback, useRef, useState } from "react";
import { useDidShow } from "@tarojs/taro";
import type { TryOnRecommendation, TryOnRecommendStatus } from "@/data/tryOn";
import type { WeatherSnapshot } from "@/data/weather";
import type { WardrobeItem } from "@/data/wardrobe";
import {
  recommendOutfit,
  resolveSelectedPieces,
} from "@/services/outfitRecommend";
import { fetchUserProfile } from "@/services/profile";
import { fetchWeather } from "@/services/weather";
import {
  clearTryOnCache,
  isTryOnCacheValid,
  readTryOnCache,
  writeTryOnCache,
} from "@/services/tryOnCache";
import { consumeTryOnDraft } from "@/services/tryOnDraft";
import {
  fetchWardrobeItemsGroupedByType,
  resolveImageUrls,
} from "@/services/wardrobe";
import { getCurrentSeason } from "@/utils/season";

export interface SavedReturnMeta {
  piecesChanged: boolean;
}

export function useTryOnRecommend() {
  const [status, setStatus] = useState<TryOnRecommendStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recommendation, setRecommendation] =
    useState<TryOnRecommendation | null>(null);
  const [selectedPieces, setSelectedPieces] = useState<WardrobeItem[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [savedReturn, setSavedReturn] = useState<SavedReturnMeta | null>(null);
  const [weatherSnapshot, setWeatherSnapshot] =
    useState<WeatherSnapshot | null>(null);
  const loadingRef = useRef(false);
  const allItemsRef = useRef<WardrobeItem[]>([]);

  const applyRecommendation = useCallback(
    (rec: TryOnRecommendation, items: WardrobeItem[]) => {
      setRecommendation(rec);
      setSelectedPieces(resolveSelectedPieces(rec, items));
    },
    [],
  );

  const loadFresh = useCallback(
    async (force = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setStatus("loading");
      setErrorMessage(null);
      setFromCache(false);
      setSavedReturn(null);

      try {
        const [{ items, byType }, profile] = await Promise.all([
          fetchWardrobeItemsGroupedByType(),
          fetchUserProfile(),
        ]);

        allItemsRef.current = items;

        if (items.length === 0) {
          setStatus("empty");
          setRecommendation(null);
          setSelectedPieces([]);
          return;
        }

        let weather: WeatherSnapshot;
        try {
          const weatherResult = await fetchWeather({ force });
          weather = weatherResult.snapshot;
        } catch {
          weather = {
            city: "当前位置",
            conditionCode: "sunny",
            temperature: 22,
            humidity: 50,
            aqi: 50,
          };
        }
        setWeatherSnapshot(weather);

        const rec = await recommendOutfit({
          weather,
          season: getCurrentSeason(),
          profile,
          wardrobeByType: byType,
        });

        const pieces = resolveSelectedPieces(rec, items);
        applyRecommendation(rec, items);
        writeTryOnCache({
          recommendation: rec,
          selectedPieces: pieces,
        });
        setStatus("success");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "推荐失败，请稍后重试";
        setErrorMessage(message);
        setStatus("error");
      } finally {
        loadingRef.current = false;
      }
    },
    [applyRecommendation],
  );

  const loadFromCache = useCallback(async () => {
    const cache = readTryOnCache();
    if (!cache) {
      return false;
    }
    const pieces = await resolveImageUrls(cache.selectedPieces);
    allItemsRef.current = pieces;
    setRecommendation(cache.recommendation);
    setSelectedPieces(pieces);
    setFromCache(true);
    setSavedReturn(null);
    setStatus("success");
    setErrorMessage(null);
    return true;
  }, []);

  const handleShow = useCallback(async () => {
    const draft = consumeTryOnDraft();

    if (draft?.mode === "saved" && draft.selectedPieces) {
      const pieces = await resolveImageUrls(draft.selectedPieces);
      const cache = readTryOnCache();
      if (cache) {
        setRecommendation(cache.recommendation);
      } else {
        setRecommendation({
          outfitName: draft.outfitName ?? "我的搭配",
          description: "",
          matchScore: 90,
          slots: [],
          tips: [],
        });
      }
      setSelectedPieces(pieces);
      allItemsRef.current = pieces;
      setFromCache(false);
      setSavedReturn({
        piecesChanged: draft.piecesChanged === true,
      });
      setStatus("success");
      setErrorMessage(null);
      return;
    }

    if (draft?.mode === "wardrobe-cta") {
      clearTryOnCache();
      loadFresh(true);
      return;
    }

    if (isTryOnCacheValid() && (await loadFromCache())) {
      return;
    }

    loadFresh(false);
  }, [loadFresh, loadFromCache]);

  useDidShow(() => {
    void handleShow();
  });

  const refreshRecommend = useCallback(() => {
    clearTryOnCache();
    loadFresh(true);
  }, [loadFresh]);

  return {
    status,
    errorMessage,
    recommendation,
    selectedPieces,
    fromCache,
    savedReturn,
    weatherSnapshot,
    refreshRecommend,
    allItems: allItemsRef.current,
  };
}
