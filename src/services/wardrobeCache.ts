import Taro from "@tarojs/taro";
import { CLOUD_TEMP_URL_TTL_MS } from "@/config/cloud";
import type { ClothingType, WardrobeItem } from "@/data/wardrobe";
import { WARDROBE_PAGE_SIZE } from "@/data/wardrobe";

/** 缓存条目：仅「全部」分类的第一页，重入页面时 activeTab 本就回到 0 */
export interface WardrobeCacheEntry {
  clothingTypes: ClothingType[];
  items: WardrobeItem[];
  cachedAt: number;
}

export interface InitialWardrobeState {
  clothingTypes: ClothingType[];
  items: WardrobeItem[];
  hasMore: boolean;
  hasCache: boolean;
}

const CACHE_KEY = "sw_wardrobe_list_cache";

let memoryCache: WardrobeCacheEntry | null | undefined;

function isValidItem(raw: unknown): raw is WardrobeItem {
  if (!raw || typeof raw !== "object") return false;
  const item = raw as WardrobeItem;
  return (
    typeof item._id === "string" &&
    item._id.length > 0 &&
    typeof item.name === "string" &&
    typeof item.imageFileId === "string" &&
    typeof item.createdAt === "number"
  );
}

function isValidType(raw: unknown): raw is ClothingType {
  if (!raw || typeof raw !== "object") return false;
  const type = raw as ClothingType;
  return (
    typeof type._id === "string" &&
    typeof type.name === "string" &&
    typeof type.itemCount === "number"
  );
}

function isValidEntry(raw: unknown): raw is WardrobeCacheEntry {
  if (!raw || typeof raw !== "object") return false;
  const entry = raw as WardrobeCacheEntry;
  return (
    typeof entry.cachedAt === "number" &&
    Array.isArray(entry.items) &&
    entry.items.every(isValidItem) &&
    Array.isArray(entry.clothingTypes) &&
    entry.clothingTypes.every(isValidType)
  );
}

/** 缓存内的图片临时链接是否仍在有效期内 */
function isImageUrlFresh(entry: WardrobeCacheEntry): boolean {
  return Date.now() - entry.cachedAt < CLOUD_TEMP_URL_TTL_MS;
}

function stripImageUrls(items: WardrobeItem[]): WardrobeItem[] {
  return items.map((item) => {
    if (!item.imageUrl) return item;
    const next = { ...item };
    delete next.imageUrl;
    return next;
  });
}

export function readWardrobeCache(): WardrobeCacheEntry | null {
  if (memoryCache !== undefined) {
    return memoryCache;
  }

  try {
    const raw = Taro.getStorageSync(CACHE_KEY) as WardrobeCacheEntry | "";
    if (!isValidEntry(raw)) {
      memoryCache = null;
      return null;
    }
    memoryCache = raw;
    return raw;
  } catch {
    memoryCache = null;
    return null;
  }
}

export function writeWardrobeCache(entry: WardrobeCacheEntry): void {
  memoryCache = entry;
  try {
    Taro.setStorageSync(CACHE_KEY, entry);
  } catch {
    // ignore
  }
}

/**
 * 页面首帧的初始状态。临时链接过期时保留列表结构、丢弃 imageUrl，
 * 图片位显示占位底色，等静默刷新回来补图。
 */
export function getInitialWardrobeState(): InitialWardrobeState {
  const cached = readWardrobeCache();
  if (!cached) {
    return {
      clothingTypes: [],
      items: [],
      hasMore: true,
      hasCache: false,
    };
  }

  return {
    clothingTypes: cached.clothingTypes,
    items: isImageUrlFresh(cached) ? cached.items : stripImageUrls(cached.items),
    hasMore: cached.items.length >= WARDROBE_PAGE_SIZE,
    hasCache: true,
  };
}

/** 删除单品后就地更新缓存，避免下次进入闪回已删数据 */
export function removeItemFromWardrobeCache(
  itemId: string,
  typeId: string,
): void {
  const cached = readWardrobeCache();
  if (!cached) return;

  const items = cached.items.filter((item) => item._id !== itemId);
  if (items.length === cached.items.length) return;

  writeWardrobeCache({
    ...cached,
    items,
    clothingTypes: cached.clothingTypes.map((type) =>
      type._id === typeId
        ? { ...type, itemCount: Math.max(0, type.itemCount - 1) }
        : type,
    ),
  });
}

/** 图片加载失败重解析后回填缓存（不刷新 cachedAt，仍以原始拉取时间计算有效期） */
export function updateWardrobeCacheItemUrl(
  itemId: string,
  imageUrl: string,
): void {
  const cached = readWardrobeCache();
  if (!cached) return;

  let changed = false;
  const items = cached.items.map((item) => {
    if (item._id !== itemId) return item;
    changed = true;
    return { ...item, imageUrl };
  });
  if (!changed) return;

  writeWardrobeCache({ ...cached, items });
}
