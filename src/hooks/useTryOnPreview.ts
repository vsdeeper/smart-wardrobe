import { useCallback, useEffect, useRef, useState } from "react";
import type { TryOnPreviewStatus } from "@/data/tryOn";
import type { WardrobeItem } from "@/data/wardrobe";
import { fetchUserProfile } from "@/services/profile";
import {
  buildCollageHeroUrl,
  generateTryonImage,
} from "@/services/tryOnPreview";
import { readTryOnCache, writeTryOnCache } from "@/services/tryOnCache";
import type { SavedReturnMeta } from "@/hooks/useTryOnRecommend";

interface UseTryOnPreviewOptions {
  selectedPieces: WardrobeItem[];
  outfitName: string;
  description: string;
  fromCache: boolean;
  savedReturn: SavedReturnMeta | null;
  recommendReady: boolean;
}

export function useTryOnPreview({
  selectedPieces,
  outfitName,
  description,
  fromCache,
  savedReturn,
  recommendReady,
}: UseTryOnPreviewOptions) {
  const [status, setStatus] = useState<TryOnPreviewStatus>("idle");
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroCoverFileId, setHeroCoverFileId] = useState<string | null>(null);
  const [heroFromCache, setHeroFromCache] = useState(false);
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

  const loadHeroFromCache = useCallback(() => {
    const cache = readTryOnCache();
    if (cache?.heroImageUrl || cache?.heroCoverFileId) {
      applyHero(
        cache.heroImageUrl ?? null,
        cache.heroCoverFileId ?? null,
        true,
      );
      return true;
    }
    return false;
  }, [applyHero]);

  const generatePreview = useCallback(async () => {
    if (loadingRef.current || selectedPieces.length === 0) return;
    loadingRef.current = true;
    setStatus("loading");
    setHeroFromCache(false);

    try {
      const profile = await fetchUserProfile();
      const fileIds = selectedPieces
        .map((p) => p.imageFileId)
        .filter(Boolean);

      const result = await generateTryonImage({
        imageFileIds: fileIds,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        outfitName,
        description,
      });

      if (result.error && !result.coverUrl && !result.coverFileId) {
        throw new Error(result.message || result.error);
      }

      let coverUrl = result.coverUrl ?? null;
      const coverFileId = result.coverFileId ?? null;

      if (!coverUrl) {
        coverUrl = buildCollageHeroUrl(selectedPieces);
      }

      applyHero(coverUrl, coverFileId, false);

      const cache = readTryOnCache();
      if (cache) {
        writeTryOnCache({
          recommendation: cache.recommendation,
          selectedPieces,
          heroCoverFileId: coverFileId ?? undefined,
          heroImageUrl: coverUrl ?? undefined,
        });
      }
    } catch {
      const fallback = buildCollageHeroUrl(selectedPieces);
      applyHero(fallback, selectedPieces[0]?.imageFileId ?? null, false);
    } finally {
      loadingRef.current = false;
    }
  }, [selectedPieces, outfitName, description, applyHero]);

  useEffect(() => {
    if (!recommendReady || selectedPieces.length === 0) return;

    const pieceKey = selectedPieces.map((p) => p._id).join(",");
    const triggerKey = savedReturn
      ? `saved:${savedReturn.piecesChanged}:${pieceKey}`
      : fromCache
        ? `cache:${pieceKey}`
        : `fresh:${pieceKey}`;

    if (handledKeyRef.current === triggerKey) return;

    if (savedReturn) {
      if (!savedReturn.piecesChanged) {
        if (loadHeroFromCache()) {
          handledKeyRef.current = triggerKey;
          return;
        }
      }
      handledKeyRef.current = triggerKey;
      generatePreview();
      return;
    }

    if (fromCache) {
      if (loadHeroFromCache()) {
        handledKeyRef.current = triggerKey;
        return;
      }
    }

    handledKeyRef.current = triggerKey;
    generatePreview();
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
    generatePreview,
  };
}
