import { createEmptyImageUrlCacheStore } from "@/utils/image-url-cache";
import { IMAGE_URL_CACHE_CATEGORY_KEYS } from "@/constants/image-url";
import { type ImageUrlCacheCategory, type ImageUrlCacheEntry, type ImageUrlCacheStore } from "@/types/image-url";
/**
 * 云存储临时链接跨会话缓存（`sw_image_url_cache`）。
 *
 * 四域语义：
 * - `wardrobe` → `WardrobeItem.imageFileId`；试穿选品、识别 preview、日记详情 piece 亦走此域
 * - `visualDiary` → `VisualDiaryEntry.coverFileId`、试穿 Hero `heroCoverFileId`（封面）
 * - `recognition` → `RecognitionBatch.coverFileId`（仅封面）
 * - `avatar` → `UserProfile.avatarFileId`
 *
 * 读模型：业务缓存只存 fileId；展示用 `getCachedImageUrl(category, fileId)` 查表。
 * 写模型：`resolveTempFileUrls` 后 `mergeImageUrlCache` / `putImageUrlCache`。
 * 旧三域 storage 不兼容，整包作废。
 *
 * ```typescript
 * const known = getFreshUrlMap("visualDiary", coverIds);
 * const map = await resolveTempFileUrls(coverIds, known);
 * mergeImageUrlCache("visualDiary", resolvedUrlMapToEntries(map));
 * const src = getCachedImageUrl("visualDiary", coverId);
 * ```
 */
import Taro from "@tarojs/taro";

import { isImageUrlFresh, type ResolvedImageUrl } from "@/services/cloud-file";

const CACHE_KEY = "sw_image_url_cache";

let memoryCache: ImageUrlCacheStore | null | undefined;

function isValidEntry(raw: unknown): raw is ImageUrlCacheEntry {
  if (!raw || typeof raw !== "object") return false;
  const entry = raw as ImageUrlCacheEntry;
  return (
    typeof entry.fileId === "string" &&
    entry.fileId.length > 0 &&
    typeof entry.url === "string" &&
    entry.url.length > 0 &&
    typeof entry.at === "number"
  );
}

function isValidStore(raw: unknown): raw is ImageUrlCacheStore {
  if (!raw || typeof raw !== "object") return false;
  const store = raw as ImageUrlCacheStore;
  return (
    Array.isArray(store.wardrobeList) &&
    store.wardrobeList.every(isValidEntry) &&
    Array.isArray(store.visualDiaryList) &&
    store.visualDiaryList.every(isValidEntry) &&
    Array.isArray(store.recognitionList) &&
    store.recognitionList.every(isValidEntry) &&
    Array.isArray(store.avatarList) &&
    store.avatarList.every(isValidEntry)
  );
}

function getCategoryList(
  store: ImageUrlCacheStore,
  category: ImageUrlCacheCategory,
): ImageUrlCacheEntry[] {
  return store[IMAGE_URL_CACHE_CATEGORY_KEYS[category]];
}

function setCategoryList(
  store: ImageUrlCacheStore,
  category: ImageUrlCacheCategory,
  list: ImageUrlCacheEntry[],
): ImageUrlCacheStore {
  const key = IMAGE_URL_CACHE_CATEGORY_KEYS[category];
  return { ...store, [key]: list };
}

function stripStaleEntries(list: ImageUrlCacheEntry[]): ImageUrlCacheEntry[] {
  return list.filter((entry) => isImageUrlFresh(entry.at));
}

/** 按 fileId upsert，同 fileId 保留最新 at */
function upsertEntries(
  existing: ImageUrlCacheEntry[],
  incoming: ImageUrlCacheEntry[],
): ImageUrlCacheEntry[] {
  const map = new Map<string, ImageUrlCacheEntry>();
  for (const entry of existing) {
    map.set(entry.fileId, entry);
  }
  for (const entry of incoming) {
    const prev = map.get(entry.fileId);
    if (!prev || entry.at >= prev.at) {
      map.set(entry.fileId, entry);
    }
  }
  return [...map.values()];
}

function normalizeStore(raw: ImageUrlCacheStore): ImageUrlCacheStore {
  let store = createEmptyImageUrlCacheStore();
  for (const category of Object.keys(
    IMAGE_URL_CACHE_CATEGORY_KEYS,
  ) as ImageUrlCacheCategory[]) {
    const fresh = stripStaleEntries(getCategoryList(raw, category));
    store = setCategoryList(store, category, fresh);
  }
  return store;
}

function persistStore(store: ImageUrlCacheStore): void {
  memoryCache = store;
  try {
    Taro.setStorageSync(CACHE_KEY, store);
  } catch {
    // ignore
  }
}

function loadRawStore(): ImageUrlCacheStore | null {
  if (memoryCache !== undefined) {
    return memoryCache;
  }

  try {
    const raw = Taro.getStorageSync(CACHE_KEY) as ImageUrlCacheStore | "";
    if (!isValidStore(raw)) {
      memoryCache = null;
      try {
        Taro.removeStorageSync(CACHE_KEY);
      } catch {
        // ignore
      }
      return null;
    }
    memoryCache = raw;
    return raw;
  } catch {
    memoryCache = null;
    return null;
  }
}

/** 读全量 store，strip 过期项；若有变更则回写 storage */
export function readImageUrlCache(): ImageUrlCacheStore {
  const raw = loadRawStore();
  if (!raw) {
    const empty = createEmptyImageUrlCacheStore();
    memoryCache = empty;
    return empty;
  }

  const normalized = normalizeStore(raw);
  const changed =
    JSON.stringify(raw) !== JSON.stringify(normalized);
  if (changed) {
    persistStore(normalized);
  }
  return normalized;
}

/** 返回某域仍新鲜的条目；fileIds 可选，用于按 ID 过滤 */
export function getFreshEntries(
  category: ImageUrlCacheCategory,
  fileIds?: string[],
): ImageUrlCacheEntry[] {
  const list = getCategoryList(readImageUrlCache(), category);
  if (!fileIds || fileIds.length === 0) return list;

  const idSet = new Set(fileIds.filter(Boolean));
  return list.filter((entry) => idSet.has(entry.fileId));
}

/** 返回 Map<fileId, ResolvedImageUrl>，供 resolveTempFileUrls 的 knownUrls */
export function getFreshUrlMap(
  category: ImageUrlCacheCategory,
  fileIds?: string[],
): Map<string, ResolvedImageUrl> {
  const map = new Map<string, ResolvedImageUrl>();
  for (const entry of getFreshEntries(category, fileIds)) {
    map.set(entry.fileId, { url: entry.url, at: entry.at });
  }
  return map;
}

/** 将 resolveTempFileUrls 结果转为可写入缓存的条目 */
export function resolvedUrlMapToEntries(
  map: Map<string, ResolvedImageUrl>,
): ImageUrlCacheEntry[] {
  const entries: ImageUrlCacheEntry[] = [];
  for (const [fileId, resolved] of map) {
    if (!fileId || !resolved.url || !isImageUrlFresh(resolved.at)) continue;
    entries.push({ fileId, url: resolved.url, at: resolved.at });
  }
  return entries;
}

/**
 * 返回仍新鲜的临时 URL；过期或不存在则回退为 fileId。
 * 展示层直接 `src={getCachedImageUrl(category, fileId)}`。
 */
export function getCachedImageUrl(
  category: ImageUrlCacheCategory,
  fileId: string,
): string {
  const id = fileId.trim();
  if (!id) return "";

  const entry = getFreshEntries(category, [id])[0];
  return entry?.url || id;
}

/** 批量 upsert 并持久化（无条数上限，仅依赖 TTL 淘汰） */
export function mergeImageUrlCache(
  category: ImageUrlCacheCategory,
  entries: ImageUrlCacheEntry[],
): void {
  const valid = entries.filter(isValidEntry);
  if (valid.length === 0) return;

  const store = readImageUrlCache();
  const merged = upsertEntries(getCategoryList(store, category), valid);
  persistStore(setCategoryList(store, category, merged));
}

/** 单条写入便捷方法 */
export function putImageUrlCache(
  category: ImageUrlCacheCategory,
  fileId: string,
  url: string,
  at: number = Date.now(),
): void {
  const id = fileId.trim();
  const resolvedUrl = url.trim();
  if (!id || !resolvedUrl) return;

  mergeImageUrlCache(category, [{ fileId: id, url: resolvedUrl, at }]);
}

/** 按 fileId 删除指定条目 */
export function removeImageUrlCache(
  category: ImageUrlCacheCategory,
  fileId: string,
): void {
  const id = fileId.trim();
  if (!id) return;

  const store = readImageUrlCache();
  const list = getCategoryList(store, category);
  const next = list.filter((entry) => entry.fileId !== id);
  if (next.length === list.length) return;

  persistStore(setCategoryList(store, category, next));
}

/** 清空单域或全量 */
export function clearImageUrlCache(category?: ImageUrlCacheCategory): void {
  if (!category) {
    persistStore(createEmptyImageUrlCacheStore());
    return;
  }

  const store = readImageUrlCache();
  persistStore(setCategoryList(store, category, []));
}
