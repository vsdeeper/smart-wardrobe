import { useCallback, useEffect, useRef, useState } from "react";
import type { TryOnPreviewStatus } from "@/data/tryOn";
import type { WardrobeItem } from "@/data/wardrobe";
import { fetchUserProfile } from "@/services/profile";
import { resolveCloudFileUrl } from "@/services/wardrobe";
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

  const loadHeroFromCache = useCallback(async () => {
    const cache = readTryOnCache();
    if (!cache?.heroImageUrl && !cache?.heroCoverFileId) {
      return false;
    }

    const coverFileId = cache.heroCoverFileId ?? null;
    let coverUrl = cache.heroImageUrl ?? null;

    if (coverFileId) {
      const freshUrl = await resolveCloudFileUrl(coverFileId);
      if (freshUrl) {
        coverUrl = freshUrl;
      }
    }

    applyHero(coverUrl, coverFileId, true);

    if (coverUrl && cache) {
      writeTryOnCache({
        recommendation: cache.recommendation,
        selectedPieces: cache.selectedPieces,
        heroCoverFileId: coverFileId ?? undefined,
        heroImageUrl: coverUrl,
      });
    }

    return Boolean(coverUrl || coverFileId);
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
    generatePreview,
  };
}
