import { WardrobeItem } from "@/types/wardrobe";
import { TryOnCacheStore, TryOnWearCacheEntry } from "@/types/try-on";
import Taro from "@tarojs/taro";


import { isImageUrlFresh } from "@/services/cloud-file";
import {
  getCachedImageUrl,
  getFreshUrlMap,
  mergeImageUrlCache,
  putImageUrlCache,
} from "@/services/image-url-cache";
import { getDateKey } from "@/utils/season";

const CACHE_KEY = "sw_tryon_wear_cache";
const LEGACY_CACHE_KEY = "sw_tryon_daily_cache";

export type TryOnAiCache = TryOnWearCacheEntry &
  Required<Pick<TryOnWearCacheEntry, "recommendation" | "selectedPieces">>;

function withoutImageUrl(item: WardrobeItem): WardrobeItem {
  if (!item.imageUrl && !item.imageUrlAt) return item;
  const next = { ...item };
  delete next.imageUrl;
  delete next.imageUrlAt;
  return next;
}

function withoutImageUrls(
  items: WardrobeItem[] | undefined,
): WardrobeItem[] | undefined {
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

function createEmptyStore(activeWearDateKey = getDateKey()): TryOnCacheStore {
  return {
    version: 2,
    activeWearDateKey,
    entries: {},
  };
}

function persistStore(store: TryOnCacheStore): void {
  try {
    Taro.setStorageSync(CACHE_KEY, store);
  } catch {
    // ignore
  }
}

/** 读取试穿分桶 store；无效时返回空 store */
export function readTryOnCacheStore(): TryOnCacheStore {
  try {
    const raw = Taro.getStorageSync(CACHE_KEY) as TryOnCacheStore | "";
    if (
      !raw ||
      typeof raw !== "object" ||
      raw.version !== 2 ||
      typeof raw.activeWearDateKey !== "string" ||
      !raw.entries ||
      typeof raw.entries !== "object"
    ) {
      return createEmptyStore();
    }
    return raw;
  } catch {
    return createEmptyStore();
  }
}

export function getActiveWearDateKey(): string {
  return readTryOnCacheStore().activeWearDateKey;
}

export function setActiveWearDateKey(wearDateKey: string): void {
  const store = readTryOnCacheStore();
  store.activeWearDateKey = wearDateKey;
  persistStore(store);
}

export function readWearCache(
  wearDateKey: string,
): TryOnWearCacheEntry | null {
  const entry = readTryOnCacheStore().entries[wearDateKey];
  if (!entry) return null;

  migratePieceUrlsToImageCache(entry.selectedPieces);
  migratePieceUrlsToImageCache(entry.manualSelectedPieces);

  return {
    ...entry,
    selectedPieces: withoutImageUrls(entry.selectedPieces),
    manualSelectedPieces: withoutImageUrls(entry.manualSelectedPieces),
  };
}

export function isTryOnCacheValid(wearDateKey: string): boolean {
  const entry = readWearCache(wearDateKey);
  return (
    entry !== null &&
    !!entry.recommendation &&
    Array.isArray(entry.selectedPieces)
  );
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
 * 页面首帧可直接使用的 wearDate 分桶缓存。
 * 临时链不落在分桶中，展示用 getCachedImageUrl。
 */
export function getInitialTryOnCache(
  wearDateKey: string,
): TryOnAiCache | null {
  const cache = readWearCache(wearDateKey);
  if (
    !cache ||
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

/** 读取 Hero 临时链（权威在 imageUrlCache visualDiary 域） */
export function getTryOnHeroImageUrl(heroCoverFileId?: string | null): string {
  if (!heroCoverFileId) return "";
  const cached = getCachedImageUrl("visualDiary", heroCoverFileId);
  return cached !== heroCoverFileId ? cached : "";
}

export function writeWearCache(
  wearDateKey: string,
  partial: Partial<Omit<TryOnWearCacheEntry, "plannedWearDateKey" | "cachedAt">> &
    Partial<Pick<TryOnWearCacheEntry, "cachedAt">> & {
      heroImageUrl?: string;
      heroImageUrlAt?: number;
    },
  options: { clearHero?: boolean; clearManual?: boolean } = {},
): void {
  const store = readTryOnCacheStore();
  const existing = store.entries[wearDateKey] ?? null;
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

  const entry: TryOnWearCacheEntry = {
    plannedWearDateKey: wearDateKey,
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

  store.entries[wearDateKey] = entry;
  store.activeWearDateKey = wearDateKey;
  persistStore(store);
}

export function clearTryOnCache(): void {
  try {
    Taro.removeStorageSync(CACHE_KEY);
    Taro.removeStorageSync(LEGACY_CACHE_KEY);
  } catch {
    // ignore
  }
}
