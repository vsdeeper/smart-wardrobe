import { useCallback, useEffect, useRef, useState } from "react";
import { isGenderSet, isMetricsSet } from "@/data/profile";
import type { TryOnPreviewStatus } from "@/data/tryOn";
import type { WardrobeItem } from "@/data/wardrobe";
import type { WeatherSnapshot } from "@/data/weather";
import { fetchUserProfile } from "@/services/profile";
import { resolveCloudFileUrl } from "@/services/wardrobe";
import { generateTryonImage } from "@/services/tryOnPreview";
import { readTryOnCache, writeTryOnCache } from "@/services/tryOnCache";
import type { SavedReturnMeta } from "@/hooks/useTryOnRecommend";
import { isEphemeralExternalImageUrl } from "@/utils/imageUrl";

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
  const [status, setStatus] = useState<TryOnPreviewStatus>("idle");
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroCoverFileId, setHeroCoverFileId] = useState<string | null>(null);
  const [heroFromCache, setHeroFromCache] = useState(false);
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string | null>(
    null,
  );
  const loadingRef = useRef(false);
  const handledKeyRef = useRef<string | null>(null);

  const applyHero = useCallback(
    (url: string | null, fileId: string | null, cached: boolean) => {
      setHeroImageUrl(url);
      setHeroCoverFileId(fileId);
      setHeroFromCache(cached);
      setStatus(url || fileId ? "success" : "error");
    },
    [],
  );

  const loadHeroFromCache = useCallback(async () => {
    const cache = readTryOnCache();
    if (!cache?.heroImageUrl && !cache?.heroCoverFileId) {
      return false;
    }

    const coverFileId = cache.heroCoverFileId ?? null;
    if (!coverFileId) {
      const cachedUrl = cache.heroImageUrl;
      if (!cachedUrl || isEphemeralExternalImageUrl(cachedUrl)) {
        return false;
      }
      setPreviewErrorMessage(null);
      applyHero(cachedUrl, null, true);
      return true;
    }

    const freshUrl = await resolveCloudFileUrl(coverFileId);
    if (!freshUrl) {
      return false;
    }

    setPreviewErrorMessage(null);
    applyHero(freshUrl, coverFileId, true);

    writeTryOnCache({
      recommendation: cache.recommendation,
      selectedPieces: cache.selectedPieces,
      heroCoverFileId: coverFileId,
      heroImageUrl: freshUrl,
    });

    return true;
  }, [applyHero]);

  const generatePreview = useCallback(async () => {
    if (loadingRef.current || selectedPieces.length === 0) return;
    loadingRef.current = true;
    setStatus("loading");
    setHeroFromCache(false);
    setPreviewErrorMessage(null);

    try {
      const profile = await fetchUserProfile();
      if (!isGenderSet(profile.gender) || !isMetricsSet(profile)) {
        setPreviewErrorMessage("试穿前请先完善性别、身高和体重");
        applyHero(null, null, false);
        return;
      }

      const fileIds = selectedPieces
        .map((p) => p.imageFileId)
        .filter(Boolean);

      const result = await generateTryonImage({
        imageFileIds: fileIds,
        heightCm: profile.heightCm!,
        weightKg: profile.weightKg!,
        gender: profile.gender!,
        pieceLabels: selectedPieces
          .map((p) => p.name || p.typeName)
          .filter(Boolean),
        pieceTypeNames: selectedPieces
          .map((p) => p.typeName)
          .filter(Boolean),
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

      applyHero(coverUrl, coverFileId, false);

      const cache = readTryOnCache();
      if (cache) {
        writeTryOnCache({
          recommendation: cache.recommendation,
          selectedPieces,
          heroCoverFileId: coverFileId,
          heroImageUrl: coverUrl,
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
  }, [selectedPieces, applyHero, weatherSnapshot?.conditionCode]);

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
        if (!savedReturn.piecesChanged) {
          if (await loadHeroFromCache()) {
            if (!cancelled) handledKeyRef.current = triggerKey;
            return;
          }
        }
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
  };
}
