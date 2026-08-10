import { ClothingType, WardrobeItem } from "@/types/wardrobe";
import Taro from "@tarojs/taro";


/** 「全部」分类的固定 key，其余 key 为 typeId */
export const WARDROBE_ALL_TYPE_KEY = "all";

const LEGACY_STORAGE_KEY = "sw_wardrobe_list_cache";

export interface WardrobeTypeBucket {
  items: WardrobeItem[];
  hasMore: boolean;
}

interface WardrobeMemoryStore {
  clothingTypes: ClothingType[];
  /** 衣橱页当前选中的分类 key（`"all"` 或 typeId） */
  activeTypeKey: string;
  /** 搭配页当前选中的分类 typeId；无「全部」，null 表示尚未选过 */
  outfitActiveTypeKey: string | null;
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

export interface InitialOutfitState {
  clothingTypes: ClothingType[];
  activeTypeId: string | null;
  activeCategoryIndex: number;
  items: WardrobeItem[];
  hasMore: boolean;
  hasCache: boolean;
  wardrobeEmpty: boolean;
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
      outfitActiveTypeKey: null,
      byType: {},
    };
  }
  return store;
}

function isWardrobeEmptyByTypes(types: ClothingType[]): boolean {
  if (types.length === 0) return true;
  return types.every((type) => type.itemCount === 0);
}

/** 搭配页：无「全部」偏移，仅按 typeId 解析 Tab index */
function resolveOutfitActiveType(
  outfitActiveTypeKey: string | null,
  clothingTypes: ClothingType[],
): { activeTypeId: string | null; activeCategoryIndex: number } {
  if (clothingTypes.length === 0) {
    return { activeTypeId: null, activeCategoryIndex: 0 };
  }
  if (outfitActiveTypeKey) {
    const idx = clothingTypes.findIndex(
      (type) => type._id === outfitActiveTypeKey,
    );
    if (idx >= 0) {
      return { activeTypeId: outfitActiveTypeKey, activeCategoryIndex: idx };
    }
  }
  return {
    activeTypeId: clothingTypes[0]._id,
    activeCategoryIndex: 0,
  };
}

export function typeKey(typeId: string | null | undefined): string {
  return typeId ? typeId : WARDROBE_ALL_TYPE_KEY;
}

/** 内存桶不存临时链；展示用 getCachedImageUrl 查表 */
function withoutImageUrl(item: WardrobeItem): WardrobeItem {
  if (!item.imageUrl && !item.imageUrlAt) return item;
  const next = { ...item };
  delete next.imageUrl;
  delete next.imageUrlAt;
  return next;
}

function withoutImageUrls(items: WardrobeItem[]): WardrobeItem[] {
  return items.map(withoutImageUrl);
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
  items[idx] = withoutImageUrl(item);
  return { ...bucket, items };
}

/** 有则替换，无则插到列表头部（用于已缓存的目标分类桶） */
function upsertItemInBucket(
  bucket: WardrobeTypeBucket,
  item: WardrobeItem,
): WardrobeTypeBucket {
  const stripped = withoutImageUrl(item);
  const idx = bucket.items.findIndex((entry) => entry._id === stripped._id);
  if (idx < 0) {
    return { ...bucket, items: [stripped, ...bucket.items] };
  }
  const items = bucket.items.slice();
  items[idx] = stripped;
  return { ...bucket, items };
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
    items: bucket.items,
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
      items: withoutImageUrls(bucket.items),
      hasMore: bucket.hasMore,
    },
  };
  if (clothingTypes) {
    current.clothingTypes = clothingTypes;
  }
}

/** 清空指定分类桶（`null` 为「全部」）；不存在时无操作 */
export function clearWardrobeTypeBucket(typeId: string | null): void {
  const current = getOrCreateStore();
  const key = typeKey(typeId);
  if (!Object.prototype.hasOwnProperty.call(current.byType, key)) return;
  const next = { ...current.byType };
  delete next[key];
  current.byType = next;
}

export function appendWardrobeTypeBucket(
  typeId: string | null,
  pageItems: WardrobeItem[],
  hasMore: boolean,
): void {
  const current = getOrCreateStore();
  const key = typeKey(typeId);
  const strippedPage = withoutImageUrls(pageItems);
  const existing = current.byType[key];
  if (!existing) {
    current.byType = {
      ...current.byType,
      [key]: { items: strippedPage, hasMore },
    };
    return;
  }

  const seen = new Set(existing.items.map((item) => item._id));
  const merged = existing.items.slice();
  for (const item of strippedPage) {
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

export function getOutfitActiveTypeKey(): string | null {
  return getOrCreateStore().outfitActiveTypeKey;
}

/** 写入搭配页当前分类；typeId 不在 types 中则置 null */
export function setOutfitActiveTypeKey(typeId: string | null): void {
  const current = getOrCreateStore();
  if (!typeId) {
    current.outfitActiveTypeKey = null;
    return;
  }
  const exists = current.clothingTypes.some((type) => type._id === typeId);
  current.outfitActiveTypeKey = exists ? typeId : null;
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
    items: bucket.items,
    hasMore: bucket.hasMore,
    hasCache: true,
    activeTab: resolved.activeTab,
    activeTypeKey: resolved.activeTypeKey,
  };
}

/**
 * 搭配页首帧状态。按 outfitActiveTypeKey 恢复 Tab 与对应桶（无「全部」）；
 * 无该桶则 hasCache: false，由页面拉取。
 */
export function getInitialOutfitState(): InitialOutfitState {
  ensureLegacyStorageCleared();
  const current = store;
  if (!current) {
    return {
      clothingTypes: [],
      activeTypeId: null,
      activeCategoryIndex: 0,
      items: [],
      hasMore: true,
      hasCache: false,
      wardrobeEmpty: true,
    };
  }

  const resolved = resolveOutfitActiveType(
    current.outfitActiveTypeKey,
    current.clothingTypes,
  );
  // 持久化解析后的有效 typeId（含首次回落到首个分类）
  if (resolved.activeTypeId !== current.outfitActiveTypeKey) {
    current.outfitActiveTypeKey = resolved.activeTypeId;
  }

  const wardrobeEmpty = isWardrobeEmptyByTypes(current.clothingTypes);
  if (!resolved.activeTypeId) {
    return {
      clothingTypes: current.clothingTypes,
      activeTypeId: null,
      activeCategoryIndex: 0,
      items: [],
      hasMore: false,
      hasCache: current.clothingTypes.length > 0,
      wardrobeEmpty,
    };
  }

  const bucket = current.byType[resolved.activeTypeId];
  if (!bucket) {
    return {
      clothingTypes: current.clothingTypes,
      activeTypeId: resolved.activeTypeId,
      activeCategoryIndex: resolved.activeCategoryIndex,
      items: [],
      hasMore: true,
      hasCache: false,
      wardrobeEmpty,
    };
  }

  return {
    clothingTypes: current.clothingTypes,
    activeTypeId: resolved.activeTypeId,
    activeCategoryIndex: resolved.activeCategoryIndex,
    items: bucket.items,
    hasMore: bucket.hasMore,
    hasCache: true,
    wardrobeEmpty,
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
