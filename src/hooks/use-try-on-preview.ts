import { WeatherSnapshot } from "@/types/weather";
import { WardrobeItem } from "@/types/wardrobe";
import { TryOnPreviewStatus } from "@/types/try-on";
import { isGenderSet, isMetricsSet } from "@/utils/profile";
import { useCallback, useEffect, useRef, useState } from "react";




import { resolveCloudFileUrl } from "@/services/cloud-file";
import { putImageUrlCache } from "@/services/image-url-cache";
import { fetchUserProfile } from "@/services/profile";
import { generateTryonImage } from "@/services/try-on-preview";
import {
  getInitialTryOnCache,
  getTryOnHeroImageUrl,
  writeTryOnCache,
} from "@/services/try-on-cache";
import type { SavedReturnMeta } from "@/hooks/use-try-on-recommend";
import { isEphemeralExternalImageUrl } from "@/utils/image-url";

interface UseTryOnPreviewOptions {
  selectedPieces: WardrobeItem[];
  outfitName: string;
  description: string;
  fromCache: boolean;
  savedReturn: SavedReturnMeta | null;
  recommendReady: boolean;
  weatherSnapshot?: WeatherSnapshot | null;
}

export function useTryOnPreview({
  selectedPieces,
  fromCache,
  savedReturn,
  recommendReady,
  weatherSnapshot,
}: UseTryOnPreviewOptions) {
  const [initialCache] = useState(getInitialTryOnCache);
  const initialHeroUrl = getTryOnHeroImageUrl(initialCache?.heroCoverFileId);
  const [status, setStatus] = useState<TryOnPreviewStatus>(
    initialHeroUrl ? "success" : "idle",
  );
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(
    initialHeroUrl || null,
  );
  const [heroCoverFileId, setHeroCoverFileId] = useState<string | null>(
    initialCache?.heroCoverFileId ?? null,
  );
  const [heroFromCache, setHeroFromCache] = useState(!!initialHeroUrl);
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string | null>(
    null,
  );
  const loadingRef = useRef(false);
  const handledKeyRef = useRef<string | null>(null);
  const imageRetriedRef = useRef<Set<string>>(new Set());

  const applyHero = useCallback(
    (url: string | null, fileId: string | null, cached: boolean) => {
      setHeroImageUrl(url);
      setHeroCoverFileId(fileId);
      setHeroFromCache(cached);
      setStatus(url || fileId ? "success" : "error");
    },
    [],
  );

  const persistHeroUrl = useCallback(
    (coverFileId: string, url: string, at: number = Date.now()) => {
      putImageUrlCache("visualDiary", coverFileId, url, at);
    },
    [],
  );

  const loadHeroFromCache = useCallback(async () => {
    const cache = getInitialTryOnCache();
    if (!cache?.heroCoverFileId) {
      return false;
    }
    const coverFileId = cache.heroCoverFileId;

    const cachedUrl = getTryOnHeroImageUrl(coverFileId);
    if (cachedUrl) {
      setPreviewErrorMessage(null);
      applyHero(cachedUrl, coverFileId, true);
      return true;
    }

    const freshUrl = await resolveCloudFileUrl(coverFileId);
    if (!freshUrl) {
      return false;
    }

    persistHeroUrl(coverFileId, freshUrl);
    setPreviewErrorMessage(null);
    applyHero(freshUrl, coverFileId, true);

    writeTryOnCache({
      recommendation: cache.recommendation,
      selectedPieces: cache.selectedPieces,
      heroCoverFileId: coverFileId,
    });

    return true;
  }, [applyHero, persistHeroUrl]);

  const generatePreview = useCallback(async () => {
    if (loadingRef.current || selectedPieces.length === 0) return;
    loadingRef.current = true;
    setStatus("loading");
    setHeroImageUrl(null);
    setHeroCoverFileId(null);
    setHeroFromCache(false);
    setPreviewErrorMessage(null);

    try {
      const profile = await fetchUserProfile();
      if (!isGenderSet(profile.gender) || !isMetricsSet(profile)) {
        setPreviewErrorMessage("试穿前请先完善性别、身高和体重");
        applyHero(null, null, false);
        return;
      }

      const fileIds = selectedPieces.map((p) => p.imageFileId).filter(Boolean);

      const result = await generateTryonImage({
        imageFileIds: fileIds,
        heightCm: profile.heightCm!,
        weightKg: profile.weightKg!,
        gender: profile.gender!,
        pieceLabels: selectedPieces
          .map((p) => p.name || p.typeName)
          .filter(Boolean),
        pieceTypeNames: selectedPieces.map((p) => p.typeName).filter(Boolean),
        weatherConditionCode: weatherSnapshot?.conditionCode,
      });

      if (result.error) {
        throw new Error(result.message || result.error);
      }

      const coverFileId = result.coverFileId ?? null;
      let coverUrl = result.coverUrl ?? null;

      if (!coverFileId) {
        throw new Error("试穿图没能生成，请稍后重试");
      }

      if (!coverUrl || isEphemeralExternalImageUrl(coverUrl)) {
        coverUrl = (await resolveCloudFileUrl(coverFileId)) ?? null;
      }

      if (!coverUrl) {
        throw new Error("试穿图没能生成，请稍后重试");
      }

      const at = Date.now();
      persistHeroUrl(coverFileId, coverUrl, at);
      applyHero(coverUrl, coverFileId, false);
      imageRetriedRef.current.delete(coverFileId);

      const cache = getInitialTryOnCache();
      if (!savedReturn && cache) {
        writeTryOnCache({
          recommendation: cache.recommendation,
          selectedPieces,
          heroCoverFileId: coverFileId,
          wearConfirmed: false,
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "试穿图生成失败，请稍后重试";
      setPreviewErrorMessage(message);
      applyHero(null, null, false);
    } finally {
      loadingRef.current = false;
    }
  }, [
    selectedPieces,
    applyHero,
    persistHeroUrl,
    weatherSnapshot?.conditionCode,
    savedReturn,
  ]);

  const handleHeroImageError = useCallback(async () => {
    const fileId = heroCoverFileId;
    if (!fileId || imageRetriedRef.current.has(fileId)) return;
    if (loadingRef.current) return;
    imageRetriedRef.current.add(fileId);

    try {
      const freshUrl = await resolveCloudFileUrl(fileId);
      if (!freshUrl) return;

      persistHeroUrl(fileId, freshUrl);
      setHeroImageUrl(freshUrl);
      setHeroFromCache(false);
      setPreviewErrorMessage(null);
      setStatus("success");

      const cache = getInitialTryOnCache();
      if (!savedReturn && cache) {
        writeTryOnCache({
          recommendation: cache.recommendation,
          selectedPieces: cache.selectedPieces,
          heroCoverFileId: fileId,
        });
      }
    } catch {
      // 兜底失败不打扰用户，手动重试时会重新生成
    }
  }, [heroCoverFileId, persistHeroUrl, savedReturn]);

  useEffect(() => {
    if (!recommendReady || fromCache || selectedPieces.length === 0) return;

    setHeroImageUrl(null);
    setHeroCoverFileId(null);
    setStatus("loading");
    setPreviewErrorMessage(null);
  }, [recommendReady, fromCache, selectedPieces]);

  useEffect(() => {
    if (!recommendReady || selectedPieces.length === 0) return;

    const pieceKey = selectedPieces.map((p) => p._id).join(",");
    const triggerKey = savedReturn
      ? `saved:${savedReturn.piecesChanged}:${pieceKey}`
      : fromCache
        ? `cache:${pieceKey}`
        : `fresh:${pieceKey}`;

    if (handledKeyRef.current === triggerKey) return;

    let cancelled = false;

    const run = async () => {
      if (savedReturn) {
        if (!cancelled) {
          handledKeyRef.current = triggerKey;
          generatePreview();
        }
        return;
      }

      if (fromCache) {
        if (await loadHeroFromCache()) {
          if (!cancelled) handledKeyRef.current = triggerKey;
          return;
        }
      }

      if (!cancelled) {
        handledKeyRef.current = triggerKey;
        generatePreview();
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    recommendReady,
    selectedPieces,
    fromCache,
    savedReturn,
    generatePreview,
    loadHeroFromCache,
  ]);

  return {
    status,
    heroImageUrl,
    heroCoverFileId,
    heroFromCache,
    previewErrorMessage,
    generatePreview,
    handleHeroImageError,
  };
}
