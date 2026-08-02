import { useCallback, useRef, useState } from "react";
import { useDidShow } from "@tarojs/taro";
import type { TryOnRecommendation, TryOnRecommendStatus } from "@/data/tryOn";
import type { WeatherSnapshot } from "@/data/weather";
import type { WardrobeItem } from "@/data/wardrobe";
import { isGenderSet, isMetricsSet } from "@/data/profile";
import { attachImageUrls, collectImageUrls } from "@/services/cloudFile";
import {
  recommendOutfit,
  recommendSelectedOutfit,
  resolveSelectedPieces,
} from "@/services/outfitRecommend";
import { fetchUserProfile } from "@/services/profile";
import { fetchWeather } from "@/services/weather";
import {
  clearTryOnCache,
  getInitialTryOnCache,
  isTryOnCacheValid,
  writeTryOnCache,
} from "@/services/tryOnCache";
import { consumeTryOnDraft } from "@/services/tryOnDraft";
import { fetchWardrobeItemsGroupedByType } from "@/services/wardrobe";
import { getCurrentSeason } from "@/utils/season";

export interface SavedReturnMeta {
  piecesChanged: boolean;
}

export function useTryOnRecommend() {
  const [initialCache] = useState(getInitialTryOnCache);
  const [status, setStatus] = useState<TryOnRecommendStatus>(
    initialCache ? "success" : "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recommendation, setRecommendation] =
    useState<TryOnRecommendation | null>(initialCache?.recommendation ?? null);
  const [selectedPieces, setSelectedPieces] = useState<WardrobeItem[]>(
    initialCache?.selectedPieces ?? []
  );
  const [fromCache, setFromCache] = useState(initialCache !== null);
  const [savedReturn, setSavedReturn] = useState<SavedReturnMeta | null>(null);
  const [weatherSnapshot, setWeatherSnapshot] =
    useState<WeatherSnapshot | null>(initialCache?.weatherSnapshot ?? null);
  const loadingRef = useRef(false);
  const manualDraftRef = useRef<{
    selectedPieces: WardrobeItem[];
    piecesChanged: boolean;
  } | null>(null);
  const allItemsRef = useRef<WardrobeItem[]>(
    initialCache?.selectedPieces ?? []
  );

  const applyRecommendation = useCallback(
    (rec: TryOnRecommendation, pieces: WardrobeItem[]) => {
      setRecommendation(rec);
      setSelectedPieces(pieces);
    },
    []
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

        if (!isGenderSet(profile.gender)) {
          setStatus("needsGender");
          setRecommendation(null);
          setSelectedPieces([]);
          return;
        }

        if (!isMetricsSet(profile)) {
          setStatus("error");
          setErrorMessage("推荐前请先完善身高和体重");
          setRecommendation(null);
          setSelectedPieces([]);
          return;
        }

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
        const piecesWithUrls = await attachImageUrls(pieces);
        applyRecommendation(rec, piecesWithUrls);
        writeTryOnCache(
          {
            recommendation: rec,
            selectedPieces: piecesWithUrls,
            weatherSnapshot: weather,
            wearConfirmed: false,
          },
          { clearHero: true, clearManual: true }
        );
        setStatus("success");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "没能生成推荐，请稍后重试";
        setErrorMessage(message);
        setStatus("error");
      } finally {
        loadingRef.current = false;
      }
    },
    [applyRecommendation]
  );

  const loadManual = useCallback(
    async (piecesFromDraft: WardrobeItem[], piecesChanged: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      manualDraftRef.current = {
        selectedPieces: piecesFromDraft,
        piecesChanged,
      };
      setStatus("loading");
      setErrorMessage(null);
      setFromCache(false);
      setSavedReturn({ piecesChanged });

      try {
        const profile = await fetchUserProfile();
        if (!isGenderSet(profile.gender)) {
          setStatus("needsGender");
          setRecommendation(null);
          setSelectedPieces([]);
          return;
        }
        if (!isMetricsSet(profile)) {
          setStatus("error");
          setErrorMessage("评价前请先完善身高和体重");
          setRecommendation(null);
          setSelectedPieces([]);
          return;
        }

        let weather: WeatherSnapshot;
        try {
          const weatherResult = await fetchWeather();
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

        const pieces = await attachImageUrls(piecesFromDraft);
        const rec = await recommendSelectedOutfit({
          weather,
          season: getCurrentSeason(),
          profile,
          selectedPieces: pieces,
        });

        applyRecommendation(rec, pieces);
        allItemsRef.current = pieces;
        setWeatherSnapshot(weather);
        writeTryOnCache({
          selectedRecommendation: rec,
          manualSelectedPieces: pieces,
        });
        setStatus("success");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "没能生成评价，请稍后重试";
        setErrorMessage(message);
        setStatus("error");
      } finally {
        loadingRef.current = false;
      }
    },
    [applyRecommendation]
  );

  const loadFromCache = useCallback(async () => {
    const profile = await fetchUserProfile();
    if (!isGenderSet(profile.gender) || !isMetricsSet(profile)) {
      return false;
    }

    const cache = getInitialTryOnCache();
    if (!cache) {
      return false;
    }
    const pieces = await attachImageUrls(
      cache.selectedPieces,
      collectImageUrls(cache.selectedPieces)
    );
    allItemsRef.current = pieces;
    setRecommendation(cache.recommendation);
    setSelectedPieces(pieces);
    setWeatherSnapshot(cache.weatherSnapshot ?? null);
    setFromCache(true);
    setSavedReturn(null);
    setStatus("success");
    setErrorMessage(null);
    return true;
  }, []);

  const handleShow = useCallback(async () => {
    const draft = consumeTryOnDraft();

    if (draft?.mode === "saved" && draft.selectedPieces) {
      void loadManual(draft.selectedPieces, draft.piecesChanged === true);
      return;
    }

    manualDraftRef.current = null;
    if (isTryOnCacheValid() && (await loadFromCache())) {
      return;
    }

    loadFresh(false);
  }, [loadFresh, loadFromCache, loadManual]);

  useDidShow(() => {
    void handleShow();
  });

  const refreshRecommend = useCallback(() => {
    manualDraftRef.current = null;
    clearTryOnCache();
    loadFresh(true);
  }, [loadFresh]);

  const retryRecommend = useCallback(() => {
    const manualDraft = manualDraftRef.current;
    if (manualDraft) {
      void loadManual(manualDraft.selectedPieces, manualDraft.piecesChanged);
      return;
    }
    loadFresh(true);
  }, [loadFresh, loadManual]);

  return {
    status,
    errorMessage,
    recommendation,
    selectedPieces,
    fromCache,
    savedReturn,
    isManualOutfit: savedReturn !== null,
    weatherSnapshot,
    refreshRecommend,
    retryRecommend,
    allItems: allItemsRef.current,
  };
}
