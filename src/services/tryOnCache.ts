import Taro from "@tarojs/taro";
import type { TryOnDailyCache } from "@/data/tryOn";
import { getDateKey } from "@/utils/season";

const CACHE_KEY = "sw_tryon_daily_cache";

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

export function writeTryOnCache(
  partial: Omit<TryOnDailyCache, "dateKey" | "cachedAt"> &
    Partial<Pick<TryOnDailyCache, "dateKey" | "cachedAt">>,
): void {
  const existing = readTryOnCache();
  const entry: TryOnDailyCache = {
    dateKey: partial.dateKey ?? getDateKey(),
    recommendation: partial.recommendation ?? existing?.recommendation!,
    selectedPieces: partial.selectedPieces ?? existing?.selectedPieces ?? [],
    weatherSnapshot:
      partial.weatherSnapshot ?? existing?.weatherSnapshot,
    heroCoverFileId: partial.heroCoverFileId ?? existing?.heroCoverFileId,
    heroImageUrl: partial.heroImageUrl ?? existing?.heroImageUrl,
    cachedAt: partial.cachedAt ?? Date.now(),
  };
  Taro.setStorageSync(CACHE_KEY, entry);
}

export function clearTryOnCache(): void {
  try {
    Taro.removeStorageSync(CACHE_KEY);
  } catch {
    // ignore
  }
}
