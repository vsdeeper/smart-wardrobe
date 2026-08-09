import Taro from "@tarojs/taro";
import { isImageUrlFresh } from "@/services/cloudFile";
import type { ClothingType, WardrobeItem } from "@/data/wardrobe";

/** 「全部」分类的固定 key，其余 key 为 typeId */
export const WARDROBE_ALL_TYPE_KEY = "all";

const LEGACY_STORAGE_KEY = "sw_wardrobe_list_cache";

export interface WardrobeTypeBucket {
  items: WardrobeItem[];
  hasMore: boolean;
}

interface WardrobeMemoryStore {
  clothingTypes: ClothingType[];
  /** 当前选中的分类 key（`"all"` 或 typeId） */
  activeTypeKey: string;
  /** key 存在即有缓存 */
  byType: Record<string, WardrobeTypeBucket>;
}

export interface InitialWardrobeState {
  clothingTypes: ClothingType[];
  items: WardrobeItem[];
  hasMore: boolean;
  hasCache: boolean;
  activeTab: number;
  activeTypeKey: string;
}

export interface WardrobeListUpdatePatch {
  kind: "update";
  item: WardrobeItem;
  previousTypeId: string;
}

let store: WardrobeMemoryStore | null = null;
let pendingPatch: WardrobeListUpdatePatch | null = null;
let legacyStorageCleared = false;

function ensureLegacyStorageCleared(): void {
  if (legacyStorageCleared) return;
  legacyStorageCleared = true;
  try {
    Taro.removeStorageSync(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function getOrCreateStore(): WardrobeMemoryStore {
  ensureLegacyStorageCleared();
  if (!store) {
    store = {
      clothingTypes: [],
      activeTypeKey: WARDROBE_ALL_TYPE_KEY,
      byType: {},
    };
  }
  return store;
}

export function typeKey(typeId: string | null | undefined): string {
  return typeId ? typeId : WARDROBE_ALL_TYPE_KEY;
}

/** 逐 item 清理已过期的图片链接，新鲜的 item 原样保留 */
function stripStaleImageUrls(items: WardrobeItem[]): WardrobeItem[] {
  return items.map((item) => {
    if (!item.imageUrl || isImageUrlFresh(item.imageUrlAt)) return item;
    const next = { ...item };
    delete next.imageUrl;
    delete next.imageUrlAt;
    return next;
  });
}

function resolveActiveTab(
  activeTypeKey: string,
  clothingTypes: ClothingType[],
): { activeTab: number; activeTypeKey: string } {
  if (activeTypeKey === WARDROBE_ALL_TYPE_KEY) {
    return { activeTab: 0, activeTypeKey: WARDROBE_ALL_TYPE_KEY };
  }
  const idx = clothingTypes.findIndex((type) => type._id === activeTypeKey);
  if (idx < 0) {
    return { activeTab: 0, activeTypeKey: WARDROBE_ALL_TYPE_KEY };
  }
  return { activeTab: idx + 1, activeTypeKey };
}

function mutateBucketIfExists(
  key: string,
  updater: (bucket: WardrobeTypeBucket) => WardrobeTypeBucket,
): void {
  const current = getOrCreateStore();
  const bucket = current.byType[key];
  if (!bucket) return;
  current.byType = { ...current.byType, [key]: updater(bucket) };
}

function removeItemFromBucket(
  bucket: WardrobeTypeBucket,
  itemId: string,
): WardrobeTypeBucket {
  const items = bucket.items.filter((item) => item._id !== itemId);
  if (items.length === bucket.items.length) return bucket;
  return { ...bucket, items };
}

/** 仅当桶内已有该 _id 时原地替换 */
function replaceItemInBucket(
  bucket: WardrobeTypeBucket,
  item: WardrobeItem,
): WardrobeTypeBucket {
  const idx = bucket.items.findIndex((entry) => entry._id === item._id);
  if (idx < 0) return bucket;
  const items = bucket.items.slice();
  items[idx] = item;
  return { ...bucket, items };
}

/** 有则替换，无则插到列表头部（用于已缓存的目标分类桶） */
function upsertItemInBucket(
  bucket: WardrobeTypeBucket,
  item: WardrobeItem,
): WardrobeTypeBucket {
  const idx = bucket.items.findIndex((entry) => entry._id === item._id);
  if (idx < 0) {
    return { ...bucket, items: [item, ...bucket.items] };
  }
  const items = bucket.items.slice();
  items[idx] = item;
  return { ...bucket, items };
}

function patchItemInBucket(
  bucket: WardrobeTypeBucket,
  itemId: string,
  patch: Partial<WardrobeItem>,
): WardrobeTypeBucket {
  return {
    ...bucket,
    items: bucket.items.map((item) =>
      item._id === itemId ? { ...item, ...patch } : item,
    ),
  };
}

export function hasWardrobeTypeCache(typeId: string | null): boolean {
  const current = getOrCreateStore();
  return Object.prototype.hasOwnProperty.call(
    current.byType,
    typeKey(typeId),
  );
}

export function getWardrobeTypeBucket(
  typeId: string | null,
): WardrobeTypeBucket | null {
  const current = getOrCreateStore();
  const bucket = current.byType[typeKey(typeId)];
  if (!bucket) return null;
  return {
    items: stripStaleImageUrls(bucket.items),
    hasMore: bucket.hasMore,
  };
}

export function setWardrobeTypeBucket(
  typeId: string | null,
  bucket: WardrobeTypeBucket,
  clothingTypes?: ClothingType[],
): void {
  const current = getOrCreateStore();
  const key = typeKey(typeId);
  current.byType = {
    ...current.byType,
    [key]: {
      items: bucket.items,
      hasMore: bucket.hasMore,
    },
  };
  if (clothingTypes) {
    current.clothingTypes = clothingTypes;
  }
}

export function appendWardrobeTypeBucket(
  typeId: string | null,
  pageItems: WardrobeItem[],
  hasMore: boolean,
): void {
  const current = getOrCreateStore();
  const key = typeKey(typeId);
  const existing = current.byType[key];
  if (!existing) {
    current.byType = {
      ...current.byType,
      [key]: { items: pageItems, hasMore },
    };
    return;
  }

  const seen = new Set(existing.items.map((item) => item._id));
  const merged = existing.items.slice();
  for (const item of pageItems) {
    if (seen.has(item._id)) continue;
    seen.add(item._id);
    merged.push(item);
  }
  current.byType = {
    ...current.byType,
    [key]: { items: merged, hasMore },
  };
}

export function getActiveTypeKey(): string {
  return getOrCreateStore().activeTypeKey;
}

export function setActiveTypeKey(key: string): void {
  const current = getOrCreateStore();
  const resolved = resolveActiveTab(key, current.clothingTypes);
  current.activeTypeKey = resolved.activeTypeKey;
}

export function getClothingTypesFromCache(): ClothingType[] {
  return getOrCreateStore().clothingTypes;
}

export function setClothingTypesInCache(clothingTypes: ClothingType[]): void {
  getOrCreateStore().clothingTypes = clothingTypes;
}

/**
 * 页面首帧的初始状态。按 activeTypeKey 恢复 Tab 与对应桶；
 * 无该桶则 hasCache: false，由页面拉取。
 */
export function getInitialWardrobeState(): InitialWardrobeState {
  ensureLegacyStorageCleared();
  const current = store;
  if (!current) {
    return {
      clothingTypes: [],
      items: [],
      hasMore: true,
      hasCache: false,
      activeTab: 0,
      activeTypeKey: WARDROBE_ALL_TYPE_KEY,
    };
  }

  const resolved = resolveActiveTab(
    current.activeTypeKey,
    current.clothingTypes,
  );
  if (resolved.activeTypeKey !== current.activeTypeKey) {
    current.activeTypeKey = resolved.activeTypeKey;
  }

  const bucket = current.byType[resolved.activeTypeKey];
  if (!bucket) {
    return {
      clothingTypes: current.clothingTypes,
      items: [],
      hasMore: true,
      hasCache: false,
      activeTab: resolved.activeTab,
      activeTypeKey: resolved.activeTypeKey,
    };
  }

  return {
    clothingTypes: current.clothingTypes,
    items: stripStaleImageUrls(bucket.items),
    hasMore: bucket.hasMore,
    hasCache: true,
    activeTab: resolved.activeTab,
    activeTypeKey: resolved.activeTypeKey,
  };
}

/** 删除单品：双写 `"all"` + 所属 type 桶（仅已存在的 key） */
export function removeItemFromWardrobeCache(
  itemId: string,
  typeId: string,
): void {
  const current = getOrCreateStore();
  mutateBucketIfExists(WARDROBE_ALL_TYPE_KEY, (bucket) =>
    removeItemFromBucket(bucket, itemId),
  );
  if (typeId) {
    mutateBucketIfExists(typeId, (bucket) =>
      removeItemFromBucket(bucket, itemId),
    );
  }
  current.clothingTypes = current.clothingTypes.map((type) =>
    type._id === typeId
      ? { ...type, itemCount: Math.max(0, type.itemCount - 1) }
      : type,
  );
}

/** 编辑后双写/迁移单品；只改已存在的桶 */
export function applyWardrobeItemUpdate(
  updated: WardrobeItem,
  previousTypeId: string,
): void {
  const current = getOrCreateStore();
  const newTypeId = updated.typeId;
  const typeChanged = Boolean(previousTypeId) && previousTypeId !== newTypeId;

  mutateBucketIfExists(WARDROBE_ALL_TYPE_KEY, (bucket) =>
    replaceItemInBucket(bucket, updated),
  );

  if (typeChanged) {
    mutateBucketIfExists(previousTypeId, (bucket) =>
      removeItemFromBucket(bucket, updated._id),
    );
    mutateBucketIfExists(newTypeId, (bucket) =>
      upsertItemInBucket(bucket, updated),
    );

    let types = current.clothingTypes.map((type) => {
      if (type._id === previousTypeId) {
        return { ...type, itemCount: Math.max(0, type.itemCount - 1) };
      }
      if (type._id === newTypeId) {
        return { ...type, itemCount: type.itemCount + 1 };
      }
      return type;
    });

    if (
      newTypeId &&
      !types.some((type) => type._id === newTypeId)
    ) {
      types = [
        {
          _id: newTypeId,
          name: updated.typeName,
          itemCount: 1,
        },
        ...types,
      ];
    }
    current.clothingTypes = types;
    return;
  }

  if (newTypeId) {
    mutateBucketIfExists(newTypeId, (bucket) =>
      replaceItemInBucket(bucket, updated),
    );
  }
}

/** 临时链接回填：双写 `"all"` + 所属 type 桶 */
export function updateWardrobeCacheItemUrl(
  itemId: string,
  imageUrl: string,
  imageUrlAt: number,
  typeId?: string,
): void {
  const current = getOrCreateStore();
  let resolvedTypeId = typeId;

  if (!resolvedTypeId) {
    const allBucket = current.byType[WARDROBE_ALL_TYPE_KEY];
    const found = allBucket?.items.find((item) => item._id === itemId);
    resolvedTypeId = found?.typeId;
    if (!resolvedTypeId) {
      for (const [key, bucket] of Object.entries(current.byType)) {
        if (key === WARDROBE_ALL_TYPE_KEY) continue;
        const hit = bucket.items.find((item) => item._id === itemId);
        if (hit) {
          resolvedTypeId = hit.typeId || key;
          break;
        }
      }
    }
  }

  const patch = { imageUrl, imageUrlAt };
  mutateBucketIfExists(WARDROBE_ALL_TYPE_KEY, (bucket) =>
    patchItemInBucket(bucket, itemId, patch),
  );
  if (resolvedTypeId) {
    mutateBucketIfExists(resolvedTypeId, (bucket) =>
      patchItemInBucket(bucket, itemId, patch),
    );
  }
}

export function setPendingWardrobeListPatch(
  patch: WardrobeListUpdatePatch,
): void {
  pendingPatch = patch;
}

export function takePendingWardrobeListPatch(): WardrobeListUpdatePatch | null {
  const patch = pendingPatch;
  pendingPatch = null;
  return patch;
}
