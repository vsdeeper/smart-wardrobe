import { WardrobeItem } from "@/types/wardrobe";
import { WeatherSnapshot } from "@/types/weather";
import { TryOnRecommendation, TryOnRecommendStatus } from "@/types/try-on";
import { isGenderSet, isMetricsSet } from "@/utils/profile";
import { useCallback, useRef, useState } from "react";
import { useDidShow } from "@tarojs/taro";


import { resolveTempFileUrls } from "@/services/cloud-file";
import {
  getFreshUrlMap,
  mergeImageUrlCache,
  resolvedUrlMapToEntries,
} from "@/services/image-url-cache";
import {
  recommendOutfit,
  recommendSelectedOutfit,
  resolveSelectedPieces,
} from "@/services/outfit-recommend";
import { fetchUserProfile } from "@/services/profile";
import { fetchWeatherForWearDate } from "@/services/weather";
import {
  allPieceUrlsFresh,
  getActiveWearDateKey,
  getInitialTryOnCache,
  setActiveWearDateKey,
  writeWearCache,
} from "@/services/try-on-cache";
import { consumeTryOnDraft } from "@/services/try-on-draft";
import { fetchWardrobeItemsGroupedByType } from "@/services/wardrobe";
import { getCurrentSeason, getDateKey } from "@/utils/season";
import { parseDateKey } from "@/utils/wear-date";

export interface SavedReturnMeta {
  piecesChanged: boolean;
}

function stripPieceImageUrls(pieces: WardrobeItem[]): WardrobeItem[] {
  return pieces.map((piece) => {
    if (!piece.imageUrl && !piece.imageUrlAt) return piece;
    const next = { ...piece };
    delete next.imageUrl;
    delete next.imageUrlAt;
    return next;
  });
}

/** 解析选品临时链并写入 imageUrlCache；返回不含 URL 的 pieces */
async function resolveAndCachePieceUrls(
  pieces: WardrobeItem[],
): Promise<WardrobeItem[]> {
  if (pieces.length === 0) return pieces;
  const fileIds = pieces.map((piece) => piece.imageFileId);
  const urlMap = await resolveTempFileUrls(
    fileIds,
    getFreshUrlMap("wardrobe", fileIds),
  );
  mergeImageUrlCache("wardrobe", resolvedUrlMapToEntries(urlMap));
  return stripPieceImageUrls(pieces);
}

function resolveInitialWearDateKey(): string {
  return getActiveWearDateKey() || getDateKey();
}

function resolveInitialState(wearDateKey: string) {
  const cache = getInitialTryOnCache(wearDateKey);
  if (cache) {
    return {
      status: "success" as TryOnRecommendStatus,
      recommendation: cache.recommendation,
      selectedPieces: cache.selectedPieces,
      weatherSnapshot: cache.weatherSnapshot ?? null,
      fromCache: true,
    };
  }
  return {
    status: "ready" as TryOnRecommendStatus,
    recommendation: null,
    selectedPieces: [] as WardrobeItem[],
    weatherSnapshot: null as WeatherSnapshot | null,
    fromCache: false,
  };
}

export function useTryOnRecommend() {
  const initialWearDateKey = resolveInitialWearDateKey();
  const initial = resolveInitialState(initialWearDateKey);

  const [plannedWearDateKey, setPlannedWearDateKeyState] =
    useState(initialWearDateKey);
  const [status, setStatus] = useState<TryOnRecommendStatus>(initial.status);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<TryOnRecommendation | null>(
    initial.recommendation,
  );
  const [selectedPieces, setSelectedPieces] = useState<WardrobeItem[]>(
    initial.selectedPieces,
  );
  const [fromCache, setFromCache] = useState(initial.fromCache);
  const [savedReturn, setSavedReturn] = useState<SavedReturnMeta | null>(null);
  const [weatherSnapshot, setWeatherSnapshot] = useState<WeatherSnapshot | null>(
    initial.weatherSnapshot,
  );
  const loadingRef = useRef(false);
  const manualDraftRef = useRef<{
    selectedPieces: WardrobeItem[];
    piecesChanged: boolean;
  } | null>(null);
  const allItemsRef = useRef<WardrobeItem[]>(initial.selectedPieces);
  const wearDateKeyRef = useRef(plannedWearDateKey);
  wearDateKeyRef.current = plannedWearDateKey;

  const applyRecommendation = useCallback(
    (rec: TryOnRecommendation, pieces: WardrobeItem[]) => {
      setRecommendation(rec);
      setSelectedPieces(pieces);
    },
    [],
  );

  const fetchWeatherForCurrentWearDate = useCallback(
    async (wearDateKey: string, force = false) => {
      const cached = getInitialTryOnCache(wearDateKey);
      if (
        !force &&
        cached?.weatherSnapshot &&
        cached.weatherSnapshot.dateKey === wearDateKey
      ) {
        return cached.weatherSnapshot;
      }
      try {
        const result = await fetchWeatherForWearDate(wearDateKey, { force });
        return result.snapshot;
      } catch {
        return {
          city: "当前位置",
          dateKey: wearDateKey,
          conditionCode: "sunny" as const,
          temperature: 22,
          humidity: 50,
          aqi: 50,
        };
      }
    },
    [],
  );

  const restoreFromCache = useCallback(async (wearDateKey: string) => {
    const cache = getInitialTryOnCache(wearDateKey);
    if (!cache) return false;

    const pieces = await resolveAndCachePieceUrls(cache.selectedPieces);
    allItemsRef.current = pieces;
    setSelectedPieces(pieces);
    setRecommendation(cache.recommendation);
    setWeatherSnapshot(cache.weatherSnapshot ?? null);
    setFromCache(true);
    setSavedReturn(null);
    setStatus("success");
    setErrorMessage(null);
    return true;
  }, []);

  const setWearDateKey = useCallback(
    async (wearDateKey: string) => {
      setActiveWearDateKey(wearDateKey);
      setPlannedWearDateKeyState(wearDateKey);
      manualDraftRef.current = null;
      setSavedReturn(null);
      setErrorMessage(null);

      const cache = getInitialTryOnCache(wearDateKey);
      if (cache && allPieceUrlsFresh(cache.selectedPieces)) {
        setFromCache(true);
        setRecommendation(cache.recommendation);
        setSelectedPieces(cache.selectedPieces);
        setWeatherSnapshot(cache.weatherSnapshot ?? null);
        allItemsRef.current = cache.selectedPieces;
        setStatus("success");
        return;
      }

      if (await restoreFromCache(wearDateKey)) {
        return;
      }

      setRecommendation(null);
      setSelectedPieces([]);
      setWeatherSnapshot(null);
      setFromCache(false);
      setStatus("ready");
    },
    [restoreFromCache],
  );

  const loadFresh = useCallback(
    async (force = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      const wearDateKey = wearDateKeyRef.current;
      setStatus("loading");
      setErrorMessage(null);
      setFromCache(false);
      setSavedReturn(null);
      manualDraftRef.current = null;

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

        const weather = await fetchWeatherForCurrentWearDate(
          wearDateKey,
          force,
        );
        setWeatherSnapshot(weather);

        const season = getCurrentSeason(parseDateKey(wearDateKey));
        const { recommendation: rec } = await recommendOutfit({
          weather,
          season,
          profile,
          wardrobeByType: byType,
          plannedWearDateKey: wearDateKey,
        });

        const pieces = resolveSelectedPieces(rec, items);
        const cachedPieces = await resolveAndCachePieceUrls(pieces);
        applyRecommendation(rec, cachedPieces);
        writeWearCache(
          wearDateKey,
          {
            recommendation: rec,
            selectedPieces: cachedPieces,
            weatherSnapshot: weather,
            wearConfirmed: false,
          },
          { clearHero: true, clearManual: true },
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
    [applyRecommendation, fetchWeatherForCurrentWearDate],
  );

  const loadManual = useCallback(
    async (
      piecesFromDraft: WardrobeItem[],
      piecesChanged: boolean,
      wearDateKey: string,
    ) => {
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

        const weather = await fetchWeatherForCurrentWearDate(wearDateKey);
        const pieces = await resolveAndCachePieceUrls(piecesFromDraft);
        const season = getCurrentSeason(parseDateKey(wearDateKey));
        const { recommendation: rec } = await recommendSelectedOutfit({
          weather,
          season,
          profile,
          selectedPieces: pieces,
          plannedWearDateKey: wearDateKey,
        });

        applyRecommendation(rec, pieces);
        allItemsRef.current = pieces;
        setWeatherSnapshot(weather);
        writeWearCache(
          wearDateKey,
          {
            recommendation: rec,
            selectedPieces: pieces,
            selectedRecommendation: rec,
            manualSelectedPieces: pieces,
            weatherSnapshot: weather,
            wearConfirmed: false,
          },
          { clearHero: true },
        );
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
    [applyRecommendation, fetchWeatherForCurrentWearDate],
  );

  const handleShow = useCallback(async () => {
    const draft = consumeTryOnDraft();
    const wearDateKey =
      draft?.plannedWearDateKey ?? getActiveWearDateKey() ?? getDateKey();

    setPlannedWearDateKeyState(wearDateKey);
    setActiveWearDateKey(wearDateKey);

    if (draft?.mode === "saved" && draft.selectedPieces) {
      void loadManual(
        draft.selectedPieces,
        draft.piecesChanged === true,
        wearDateKey,
      );
      return;
    }

    manualDraftRef.current = null;

    const cache = getInitialTryOnCache(wearDateKey);
    if (cache && allPieceUrlsFresh(cache.selectedPieces)) {
      setFromCache(true);
      setSavedReturn(null);
      setRecommendation(cache.recommendation);
      setSelectedPieces(cache.selectedPieces);
      setWeatherSnapshot(cache.weatherSnapshot ?? null);
      allItemsRef.current = cache.selectedPieces;
      setStatus("success");
      setErrorMessage(null);
      return;
    }

    if (await restoreFromCache(wearDateKey)) {
      return;
    }

    setRecommendation(null);
    setSelectedPieces([]);
    setWeatherSnapshot(null);
    setFromCache(false);
    setSavedReturn(null);
    setStatus("ready");
    setErrorMessage(null);
  }, [loadManual, restoreFromCache]);

  useDidShow(() => {
    void handleShow();
  });

  const startRecommend = useCallback(() => {
    void loadFresh(false);
  }, [loadFresh]);

  const retryRecommend = useCallback(() => {
    const manualDraft = manualDraftRef.current;
    if (manualDraft) {
      void loadManual(
        manualDraft.selectedPieces,
        manualDraft.piecesChanged,
        wearDateKeyRef.current,
      );
      return;
    }
    void loadFresh(true);
  }, [loadFresh, loadManual]);

  const refreshWeather = useCallback(async () => {
    const wearDateKey = wearDateKeyRef.current;
    const weather = await fetchWeatherForCurrentWearDate(wearDateKey, true);
    setWeatherSnapshot(weather);
    const cache = getInitialTryOnCache(wearDateKey);
    if (cache) {
      writeWearCache(wearDateKey, { weatherSnapshot: weather });
    }
  }, [fetchWeatherForCurrentWearDate]);

  return {
    status,
    errorMessage,
    recommendation,
    selectedPieces,
    fromCache,
    savedReturn,
    isManualOutfit: savedReturn !== null,
    weatherSnapshot,
    plannedWearDateKey,
    setWearDateKey,
    startRecommend,
    retryRecommend,
    refreshWeather,
    allItems: allItemsRef.current,
  };
}
