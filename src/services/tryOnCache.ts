import Taro from "@tarojs/taro";
import type { TryOnDailyCache } from "@/data/tryOn";
import type { WardrobeItem } from "@/data/wardrobe";
import { isImageUrlFresh } from "@/services/cloudFile";
import { getDateKey } from "@/utils/season";

const CACHE_KEY = "sw_tryon_daily_cache";

function stripStaleImageUrl(item: WardrobeItem): WardrobeItem {
  if (!item.imageUrl || isImageUrlFresh(item.imageUrlAt)) return item;
  const next = { ...item };
  delete next.imageUrl;
  delete next.imageUrlAt;
  return next;
}

export function isTryOnCacheValid(dateKey = getDateKey()): boolean {
  const entry = readTryOnCache();
  return entry !== null && entry.dateKey === dateKey;
}

export function readTryOnCache(): TryOnDailyCache | null {
  try {
    const raw = Taro.getStorageSync(CACHE_KEY) as TryOnDailyCache | "";
    if (!raw || typeof raw !== "object" || !raw.dateKey || !raw.recommendation) {
      return null;
    }
    if (!Array.isArray(raw.selectedPieces)) {
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
export function getInitialTryOnCache(): TryOnDailyCache | null {
  const cache = readTryOnCache();
  if (!cache || cache.dateKey !== getDateKey()) return null;

  const heroUrlFresh =
    !!cache.heroImageUrl && isImageUrlFresh(cache.heroImageUrlAt);

  return {
    ...cache,
    selectedPieces: cache.selectedPieces.map(stripStaleImageUrl),
    heroImageUrl: heroUrlFresh ? cache.heroImageUrl : undefined,
    heroImageUrlAt: heroUrlFresh ? cache.heroImageUrlAt : undefined,
  };
}

export function writeTryOnCache(
  partial: Omit<TryOnDailyCache, "dateKey" | "cachedAt"> &
    Partial<Pick<TryOnDailyCache, "dateKey" | "cachedAt">>,
  options: { clearHero?: boolean } = {},
): void {
  const existing = readTryOnCache();
  const keepExistingHero = !options.clearHero;
  const entry: TryOnDailyCache = {
    dateKey: partial.dateKey ?? getDateKey(),
    recommendation: partial.recommendation ?? existing?.recommendation!,
    selectedPieces: partial.selectedPieces ?? existing?.selectedPieces ?? [],
    weatherSnapshot:
      partial.weatherSnapshot ?? existing?.weatherSnapshot,
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
