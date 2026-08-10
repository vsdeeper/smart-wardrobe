import { WardrobeItem } from "@/types/wardrobe";
import { TryOnDailyCache } from "@/types/try-on";
import Taro from "@tarojs/taro";


import { isImageUrlFresh } from "@/services/cloud-file";
import {
  getCachedImageUrl,
  getFreshUrlMap,
  mergeImageUrlCache,
  putImageUrlCache,
} from "@/services/image-url-cache";
import { getDateKey } from "@/utils/season";

const CACHE_KEY = "sw_tryon_daily_cache";

export type TryOnAiCache = TryOnDailyCache &
  Required<Pick<TryOnDailyCache, "recommendation" | "selectedPieces">>;

function withoutImageUrl(item: WardrobeItem): WardrobeItem {
  if (!item.imageUrl && !item.imageUrlAt) return item;
  const next = { ...item };
  delete next.imageUrl;
  delete next.imageUrlAt;
  return next;
}

function withoutImageUrls(items: WardrobeItem[] | undefined): WardrobeItem[] | undefined {
  if (!items) return undefined;
  return items.map(withoutImageUrl);
}

/** 将选品上残留的临时链接迁入 imageUrlCache（wardrobe 域） */
function migratePieceUrlsToImageCache(pieces: WardrobeItem[] | undefined): void {
  if (!pieces?.length) return;
  const entries = pieces
    .filter(
      (piece) =>
        !!piece.imageFileId &&
        !!piece.imageUrl &&
        isImageUrlFresh(piece.imageUrlAt),
    )
    .map((piece) => ({
      fileId: piece.imageFileId,
      url: piece.imageUrl!,
      at: piece.imageUrlAt!,
    }));
  if (entries.length > 0) {
    mergeImageUrlCache("wardrobe", entries);
  }
}

/** 将旧日缓存中的 hero URL 迁入 imageUrlCache（visualDiary 域） */
function migrateHeroUrlToImageCache(raw: Record<string, unknown>): void {
  const fileId =
    typeof raw.heroCoverFileId === "string" ? raw.heroCoverFileId : "";
  const url = typeof raw.heroImageUrl === "string" ? raw.heroImageUrl : "";
  const at = typeof raw.heroImageUrlAt === "number" ? raw.heroImageUrlAt : 0;
  if (fileId && url && isImageUrlFresh(at)) {
    putImageUrlCache("visualDiary", fileId, url, at);
  }
}

function stripLegacyHeroFields(entry: TryOnDailyCache): TryOnDailyCache {
  const raw = entry as TryOnDailyCache & {
    heroImageUrl?: string;
    heroImageUrlAt?: number;
  };
  if (!("heroImageUrl" in raw) && !("heroImageUrlAt" in raw)) {
    return entry;
  }
  const next = { ...raw };
  delete next.heroImageUrl;
  delete next.heroImageUrlAt;
  return next;
}

function persistEntry(entry: TryOnDailyCache): void {
  try {
    Taro.setStorageSync(CACHE_KEY, entry);
  } catch {
    // ignore
  }
}

export function isTryOnCacheValid(dateKey = getDateKey()): boolean {
  const entry = readTryOnCache();
  return (
    entry !== null &&
    entry.dateKey === dateKey &&
    !!entry.recommendation &&
    Array.isArray(entry.selectedPieces)
  );
}

export function readTryOnCache(): TryOnDailyCache | null {
  try {
    const raw = Taro.getStorageSync(CACHE_KEY) as
      | (TryOnDailyCache & {
          heroImageUrl?: string;
          heroImageUrlAt?: number;
        })
      | "";
    if (!raw || typeof raw !== "object" || !raw.dateKey) {
      return null;
    }
    const hasAiCache =
      !!raw.recommendation && Array.isArray(raw.selectedPieces);
    const hasManualCache =
      !!raw.selectedRecommendation && Array.isArray(raw.manualSelectedPieces);
    if (!hasAiCache && !hasManualCache) {
      return null;
    }

    migratePieceUrlsToImageCache(raw.selectedPieces);
    migratePieceUrlsToImageCache(raw.manualSelectedPieces);
    migrateHeroUrlToImageCache(raw as unknown as Record<string, unknown>);

    const cleaned: TryOnDailyCache = stripLegacyHeroFields({
      ...raw,
      selectedPieces: withoutImageUrls(raw.selectedPieces),
      manualSelectedPieces: withoutImageUrls(raw.manualSelectedPieces),
    });

    const needsRewrite =
      JSON.stringify(raw) !== JSON.stringify(cleaned);
    if (needsRewrite) {
      persistEntry(cleaned);
    }

    return cleaned;
  } catch {
    return null;
  }
}

/** 判断 selectedPieces 对应 fileId 是否均有仍新鲜的临时链接 */
export function allPieceUrlsFresh(pieces: WardrobeItem[]): boolean {
  if (pieces.length === 0) return false;
  const fileIds = pieces.map((piece) => piece.imageFileId).filter(Boolean);
  if (fileIds.length !== pieces.length) return false;
  const map = getFreshUrlMap("wardrobe", fileIds);
  return fileIds.every((id) => map.has(id));
}

/**
 * 页面首帧可直接使用的当天缓存。
 * 临时链不落在日缓存中，展示用 getCachedImageUrl。
 */
export function getInitialTryOnCache(): TryOnAiCache | null {
  const cache = readTryOnCache();
  if (
    !cache ||
    cache.dateKey !== getDateKey() ||
    !cache.recommendation ||
    !Array.isArray(cache.selectedPieces)
  ) {
    return null;
  }

  return {
    ...cache,
    recommendation: cache.recommendation,
    selectedPieces: cache.selectedPieces.map(withoutImageUrl),
  };
}

/** 读取当日 Hero 临时链（权威在 imageUrlCache visualDiary 域） */
export function getTryOnHeroImageUrl(heroCoverFileId?: string | null): string {
  if (!heroCoverFileId) return "";
  const cached = getCachedImageUrl("visualDiary", heroCoverFileId);
  return cached !== heroCoverFileId ? cached : "";
}

export function writeTryOnCache(
  partial: Partial<Omit<TryOnDailyCache, "dateKey" | "cachedAt">> &
    Partial<Pick<TryOnDailyCache, "dateKey" | "cachedAt">> & {
      /** 迁移期兼容：写入时迁入 imageUrlCache，不落盘 */
      heroImageUrl?: string;
      heroImageUrlAt?: number;
    },
  options: { clearHero?: boolean; clearManual?: boolean } = {},
): void {
  const dateKey = partial.dateKey ?? getDateKey();
  const stored = readTryOnCache();
  const existing = stored?.dateKey === dateKey ? stored : null;
  const keepExistingHero = !options.clearHero;
  const keepExistingManual = !options.clearManual;

  const heroCoverFileId =
    partial.heroCoverFileId ??
    (keepExistingHero ? existing?.heroCoverFileId : undefined);

  if (
    heroCoverFileId &&
    partial.heroImageUrl &&
    isImageUrlFresh(partial.heroImageUrlAt)
  ) {
    putImageUrlCache(
      "visualDiary",
      heroCoverFileId,
      partial.heroImageUrl,
      partial.heroImageUrlAt,
    );
  }

  migratePieceUrlsToImageCache(partial.selectedPieces);
  migratePieceUrlsToImageCache(partial.manualSelectedPieces);

  const entry: TryOnDailyCache = {
    dateKey,
    recommendation: partial.recommendation ?? existing?.recommendation,
    selectedPieces:
      withoutImageUrls(partial.selectedPieces) ?? existing?.selectedPieces,
    selectedRecommendation:
      partial.selectedRecommendation ??
      (keepExistingManual ? existing?.selectedRecommendation : undefined),
    manualSelectedPieces:
      withoutImageUrls(partial.manualSelectedPieces) ??
      (keepExistingManual ? existing?.manualSelectedPieces : undefined),
    weatherSnapshot: partial.weatherSnapshot ?? existing?.weatherSnapshot,
    heroCoverFileId,
    wearConfirmed: partial.wearConfirmed ?? existing?.wearConfirmed,
    cachedAt: partial.cachedAt ?? Date.now(),
  };
  persistEntry(entry);
}

export function clearTryOnCache(): void {
  try {
    Taro.removeStorageSync(CACHE_KEY);
  } catch {
    // ignore
  }
}
