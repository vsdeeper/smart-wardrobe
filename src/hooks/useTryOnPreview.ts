import { useCallback, useEffect, useRef, useState } from "react";
import { isGenderSet, isMetricsSet } from "@/data/profile";
import type { TryOnPreviewStatus } from "@/data/tryOn";
import type { WardrobeItem } from "@/data/wardrobe";
import type { WeatherSnapshot } from "@/data/weather";
import { resolveCloudFileUrl } from "@/services/cloudFile";
import { fetchUserProfile } from "@/services/profile";
import { generateTryonImage } from "@/services/tryOnPreview";
import {
  getInitialTryOnCache,
  readTryOnCache,
  writeTryOnCache,
} from "@/services/tryOnCache";
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
  const [initialCache] = useState(getInitialTryOnCache);
  const [status, setStatus] = useState<TryOnPreviewStatus>(
    initialCache?.heroImageUrl ? "success" : "idle",
  );
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(
    initialCache?.heroImageUrl ?? null,
  );
  const [heroCoverFileId, setHeroCoverFileId] = useState<string | null>(
    initialCache?.heroCoverFileId ?? null,
  );
  const [heroFromCache, setHeroFromCache] = useState(
    !!initialCache?.heroImageUrl,
  );
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

  const loadHeroFromCache = useCallback(async () => {
    const cache = getInitialTryOnCache();
    if (!cache?.heroImageUrl && !cache?.heroCoverFileId) {
      return false;
    }

    if (cache.heroImageUrl) {
      setPreviewErrorMessage(null);
      applyHero(
        cache.heroImageUrl,
        cache.heroCoverFileId ?? null,
        true,
      );
      return true;
    }

    const coverFileId = cache.heroCoverFileId ?? null;
    if (!coverFileId) {
      return false;
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
      heroImageUrlAt: Date.now(),
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
      imageRetriedRef.current.delete(coverFileId);

      const cache = readTryOnCache();
      if (cache) {
        writeTryOnCache({
          recommendation: cache.recommendation,
          selectedPieces,
          heroCoverFileId: coverFileId,
          heroImageUrl: coverUrl,
          heroImageUrlAt: Date.now(),
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

  const handleHeroImageError = useCallback(async () => {
    const fileId = heroCoverFileId;
    if (!fileId || imageRetriedRef.current.has(fileId)) return;
    if (loadingRef.current) return;
    imageRetriedRef.current.add(fileId);

    try {
      const freshUrl = await resolveCloudFileUrl(fileId);
      if (!freshUrl) return;

      setHeroImageUrl(freshUrl);
      setHeroFromCache(false);
      setPreviewErrorMessage(null);
      setStatus("success");

      const cache = readTryOnCache();
      if (cache) {
        writeTryOnCache({
          recommendation: cache.recommendation,
          selectedPieces: cache.selectedPieces,
          heroCoverFileId: fileId,
          heroImageUrl: freshUrl,
          heroImageUrlAt: Date.now(),
        });
      }
    } catch {
      // 兜底失败不打扰用户，手动重试时会重新生成
    }
  }, [heroCoverFileId]);

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
    handleHeroImageError,
  };
}
