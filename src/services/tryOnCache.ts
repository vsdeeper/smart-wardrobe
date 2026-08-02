import Taro from "@tarojs/taro";
import type { TryOnDailyCache } from "@/data/tryOn";
import type { WardrobeItem } from "@/data/wardrobe";
import { isImageUrlFresh } from "@/services/cloudFile";
import { getDateKey } from "@/utils/season";

const CACHE_KEY = "sw_tryon_daily_cache";

export type TryOnAiCache = TryOnDailyCache &
  Required<Pick<TryOnDailyCache, "recommendation" | "selectedPieces">>;

function stripStaleImageUrl(item: WardrobeItem): WardrobeItem {
  if (!item.imageUrl || isImageUrlFresh(item.imageUrlAt)) return item;
  const next = { ...item };
  delete next.imageUrl;
  delete next.imageUrlAt;
  return next;
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
    const raw = Taro.getStorageSync(CACHE_KEY) as TryOnDailyCache | "";
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
    return raw;
  } catch {
    return null;
  }
}

/**
 * 页面首帧可直接使用的当天缓存。
 * 过期的临时 URL 会被剥离，保留 fileId 供页面静默重解析。
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

  const heroUrlFresh =
    !!cache.heroImageUrl && isImageUrlFresh(cache.heroImageUrlAt);

  return {
    ...cache,
    recommendation: cache.recommendation,
    selectedPieces: cache.selectedPieces.map(stripStaleImageUrl),
    heroImageUrl: heroUrlFresh ? cache.heroImageUrl : undefined,
    heroImageUrlAt: heroUrlFresh ? cache.heroImageUrlAt : undefined,
  };
}

export function writeTryOnCache(
  partial: Partial<Omit<TryOnDailyCache, "dateKey" | "cachedAt">> &
    Partial<Pick<TryOnDailyCache, "dateKey" | "cachedAt">>,
  options: { clearHero?: boolean; clearManual?: boolean } = {}
): void {
  const dateKey = partial.dateKey ?? getDateKey();
  const stored = readTryOnCache();
  const existing = stored?.dateKey === dateKey ? stored : null;
  const keepExistingHero = !options.clearHero;
  const keepExistingManual = !options.clearManual;
  const entry: TryOnDailyCache = {
    dateKey,
    recommendation: partial.recommendation ?? existing?.recommendation,
    selectedPieces: partial.selectedPieces ?? existing?.selectedPieces,
    selectedRecommendation:
      partial.selectedRecommendation ??
      (keepExistingManual ? existing?.selectedRecommendation : undefined),
    manualSelectedPieces:
      partial.manualSelectedPieces ??
      (keepExistingManual ? existing?.manualSelectedPieces : undefined),
    weatherSnapshot: partial.weatherSnapshot ?? existing?.weatherSnapshot,
    heroCoverFileId:
      partial.heroCoverFileId ??
      (keepExistingHero ? existing?.heroCoverFileId : undefined),
    heroImageUrl:
      partial.heroImageUrl ??
      (keepExistingHero ? existing?.heroImageUrl : undefined),
    heroImageUrlAt:
      partial.heroImageUrlAt ??
      (keepExistingHero ? existing?.heroImageUrlAt : undefined),
    wearConfirmed: partial.wearConfirmed ?? existing?.wearConfirmed,
    cachedAt: partial.cachedAt ?? Date.now(),
  };
  try {
    Taro.setStorageSync(CACHE_KEY, entry);
  } catch {
    // ignore
  }
}

export function clearTryOnCache(): void {
  try {
    Taro.removeStorageSync(CACHE_KEY);
  } catch {
    // ignore
  }
}
