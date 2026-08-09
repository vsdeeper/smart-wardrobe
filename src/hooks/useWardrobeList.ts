import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isWeapp } from "@/utils/platform";
import Taro, { useDidShow } from "@tarojs/taro";
import type { ClothingType, WardrobeItem } from "@/data/wardrobe";
import { WARDROBE_PAGE_SIZE } from "@/data/wardrobe";
import { collectImageUrls, resolveCloudFileUrl } from "@/services/cloudFile";
import {
  putImageUrlCache,
  removeImageUrlCache,
} from "@/services/imageUrlCache";
import {
  deleteWardrobeItem,
  fetchClothingTypes,
  fetchWardrobeItems,
} from "@/services/wardrobe";
import {
  clearInboundRefresh,
  consumeInboundRefreshTypes,
  getInboundRefresh,
  subscribeInboundRefresh,
  type InboundRefreshPayload,
} from "@/services/recognitionInboundCache";
import {
  appendWardrobeTypeBucket,
  clearWardrobeTypeBucket,
  getClothingTypesFromCache,
  getInitialWardrobeState,
  getWardrobeTypeBucket,
  hasWardrobeTypeCache,
  removeItemFromWardrobeCache,
  setActiveTypeKey,
  setClothingTypesInCache,
  setWardrobeTypeBucket,
  takePendingWardrobeListPatch,
  typeKey,
  updateWardrobeCacheItemUrl,
  WARDROBE_ALL_TYPE_KEY,
} from "@/services/wardrobeCache";

interface UseWardrobeListOptions {
  uploadFlowRef: React.MutableRefObject<boolean>;
}

function isSameTypes(a: ClothingType[], b: ClothingType[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((type, idx) => {
    const next = b[idx];
    return (
      type._id === next._id &&
      type.name === next.name &&
      type.itemCount === next.itemCount
    );
  });
}

/** 无缓存自动拉取前：命中入库信号的具体分类时清「全部」桶 */
function prepareInboundForNoCacheLoad(typeId: string | null): void {
  const signal = getInboundRefresh();
  if (!signal || !typeId) return;
  if (!signal.typeIds.includes(typeId)) return;
  clearWardrobeTypeBucket(null);
}

/** 无缓存自动拉取成功后：消费对应入库信号（不走手动刷新拉数） */
function settleInboundAfterNoCacheLoad(typeId: string | null): void {
  const signal = getInboundRefresh();
  if (!signal) return;

  if (typeId === null) {
    clearInboundRefresh();
    return;
  }

  if (!signal.typeIds.includes(typeId)) return;
  const typeName =
    getClothingTypesFromCache().find((type) => type._id === typeId)?.name ??
    "";
  consumeInboundRefreshTypes({
    typeIds: [typeId],
    typeNames: typeName ? [typeName] : [],
  });
}

export function useWardrobeList({ uploadFlowRef }: UseWardrobeListOptions) {
  const [initial] = useState(getInitialWardrobeState);
  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>(
    initial.clothingTypes,
  );
  const [items, setItems] = useState<WardrobeItem[]>(initial.items);
  const [activeTab, setActiveTab] = useState(initial.activeTab);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [listLoading, setListLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!initial.hasCache);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [inboundRefresh, setInboundRefreshState] =
    useState<InboundRefreshPayload | null>(null);
  const [refreshHintLoading, setRefreshHintLoading] = useState(false);

  const loadingRef = useRef(false);
  const itemsRef = useRef<WardrobeItem[]>([]);
  itemsRef.current = items;
  const typesRef = useRef<ClothingType[]>(initial.clothingTypes);
  const imageRetriedRef = useRef<Set<string>>(new Set());
  const requestSeqRef = useRef(0);
  const bootstrappedRef = useRef(false);
  const refreshHintLoadingRef = useRef(false);

  const activeTypeId = useMemo(() => {
    if (activeTab === 0) return null;
    return clothingTypes[activeTab - 1]?._id ?? null;
  }, [activeTab, clothingTypes]);

  const tabTitles = useMemo(
    () =>
      clothingTypes.length > 0
        ? ["全部", ...clothingTypes.map((type) => type.name)]
        : [],
    [clothingTypes],
  );

  const showRefreshHint = useMemo(() => {
    if (!inboundRefresh) return false;
    // 无缓存会自动拉接口，刷新提示无意义
    if (!hasWardrobeTypeCache(activeTypeId)) return false;
    if (activeTab === 0) return true;
    if (!activeTypeId) return false;
    return inboundRefresh.typeIds.includes(activeTypeId);
  }, [activeTab, activeTypeId, inboundRefresh]);

  const refreshHintTypeNames = useMemo(() => {
    if (!inboundRefresh) return [];
    if (activeTab === 0) return inboundRefresh.typeNames;
    const name = clothingTypes[activeTab - 1]?.name;
    return name ? [name] : inboundRefresh.typeNames;
  }, [activeTab, clothingTypes, inboundRefresh]);

  useEffect(() => {
    return subscribeInboundRefresh(setInboundRefreshState);
  }, []);

  const loadTypes = useCallback(async () => {
    const types = await fetchClothingTypes();
    typesRef.current = types;
    setClothingTypesInCache(types);
    setClothingTypes((prev) => (isSameTypes(prev, types) ? prev : types));
    return types;
  }, []);

  const loadItems = useCallback(
    async (
      options: {
        reset?: boolean;
        typeId?: string | null;
      } = {},
    ): Promise<boolean> => {
      if (loadingRef.current) return false;
      loadingRef.current = true;

      const seq = ++requestSeqRef.current;
      const reset = options.reset ?? false;
      const typeId =
        options.typeId !== undefined ? options.typeId : activeTypeId;

      if (reset) {
        setInitialLoading(true);
      } else {
        setListLoading(true);
      }

      try {
        const skip = reset ? 0 : itemsRef.current.length;
        const nextItems = await fetchWardrobeItems({
          typeId,
          skip: reset ? 0 : skip,
          limit: WARDROBE_PAGE_SIZE,
          knownUrls: collectImageUrls(itemsRef.current),
        });

        if (seq !== requestSeqRef.current) return false;

        const pageHasMore = nextItems.length >= WARDROBE_PAGE_SIZE;

        if (reset) {
          setItems(nextItems);
          setHasMore(pageHasMore);
          setWardrobeTypeBucket(
            typeId,
            { items: nextItems, hasMore: pageHasMore },
            typesRef.current,
          );
        } else {
          setItems((prev) => [...prev, ...nextItems]);
          setHasMore(pageHasMore);
          appendWardrobeTypeBucket(typeId, nextItems, pageHasMore);
        }
        return true;
      } catch (err) {
        if (seq !== requestSeqRef.current) return false;
        const message =
          err instanceof Error ? err.message : "衣橱加载失败，请稍后重试";
        Taro.showToast({ title: message, icon: "none" });
        return false;
      } finally {
        if (seq === requestSeqRef.current) {
          loadingRef.current = false;
          setListLoading(false);
          setInitialLoading(false);
        }
      }
    },
    [activeTypeId],
  );

  /** 冷启动 / remount：仅当当前分类无缓存时拉取 */
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    if (!isWeapp()) {
      setInitialLoading(false);
      return;
    }

    if (initial.hasCache) {
      setInitialLoading(false);
      return;
    }

    const typeId =
      initial.activeTypeKey === WARDROBE_ALL_TYPE_KEY
        ? null
        : initial.activeTypeKey;

    void (async () => {
      try {
        if (getClothingTypesFromCache().length === 0) {
          await loadTypes();
        } else {
          typesRef.current = getClothingTypesFromCache();
        }
        prepareInboundForNoCacheLoad(typeId);
        const ok = await loadItems({ reset: true, typeId });
        if (ok) settleInboundAfterNoCacheLoad(typeId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "衣橱加载失败，请稍后重试";
        Taro.showToast({ title: message, icon: "none" });
        setInitialLoading(false);
      }
    })();
  }, [initial, loadItems, loadTypes]);

  const activeTypeIdRef = useRef(activeTypeId);
  activeTypeIdRef.current = activeTypeId;

  useDidShow(() => {
    if (!isWeapp()) return;
    if (uploadFlowRef.current) return;

    const patch = takePendingWardrobeListPatch();
    if (!patch) return;

    const { item, previousTypeId } = patch;
    const types = getClothingTypesFromCache();
    typesRef.current = types;
    setClothingTypes((prev) => (isSameTypes(prev, types) ? prev : types));

    const currentKey = typeKey(activeTypeIdRef.current);
    if (currentKey === WARDROBE_ALL_TYPE_KEY) {
      setItems((prev) => {
        const idx = prev.findIndex((entry) => entry._id === item._id);
        if (idx < 0) return prev;
        const next = prev.slice();
        next[idx] = item;
        return next;
      });
      return;
    }

    if (currentKey === previousTypeId && previousTypeId !== item.typeId) {
      setItems((prev) => prev.filter((entry) => entry._id !== item._id));
      return;
    }

    if (currentKey === item.typeId) {
      setItems((prev) => {
        const idx = prev.findIndex((entry) => entry._id === item._id);
        if (idx < 0) return [item, ...prev];
        const next = prev.slice();
        next[idx] = item;
        return next;
      });
    }
  });

  const handleTypeChange = useCallback(
    async (value: string | number) => {
      const nextTab = value as number;
      const typeId =
        nextTab === 0 ? null : (clothingTypes[nextTab - 1]?._id ?? null);
      const key = typeKey(typeId);

      setActiveTab(nextTab);
      setActiveTypeKey(key);

      if (hasWardrobeTypeCache(typeId)) {
        const bucket = getWardrobeTypeBucket(typeId);
        setItems(bucket?.items ?? []);
        setHasMore(bucket?.hasMore ?? false);
        setInitialLoading(false);
        return;
      }

      setItems([]);
      setHasMore(true);
      loadingRef.current = false;
      prepareInboundForNoCacheLoad(typeId);
      const ok = await loadItems({ reset: true, typeId });
      if (ok) settleInboundAfterNoCacheLoad(typeId);
    },
    [clothingTypes, loadItems],
  );

  const handleScrollToLower = useCallback(() => {
    if (!hasMore || listLoading || initialLoading || loadingRef.current) return;
    loadItems();
  }, [hasMore, initialLoading, listLoading, loadItems]);

  const handleRefreshHintClick = useCallback(async () => {
    if (!isWeapp()) return;
    if (refreshHintLoadingRef.current || !inboundRefresh) return;

    const typeIdsToInvalidate = inboundRefresh.typeIds.slice();
    const currentTypeId = activeTypeIdRef.current;

    refreshHintLoadingRef.current = true;
    setRefreshHintLoading(true);
    loadingRef.current = true;
    const seq = ++requestSeqRef.current;
    setInitialLoading(true);

    try {
      await loadTypes();

      if (currentTypeId) {
        clearWardrobeTypeBucket(null);
        const nextItems = await fetchWardrobeItems({
          typeId: currentTypeId,
          skip: 0,
          limit: WARDROBE_PAGE_SIZE,
        });
        if (seq !== requestSeqRef.current) return;
        const pageHasMore = nextItems.length >= WARDROBE_PAGE_SIZE;
        setItems(nextItems);
        setHasMore(pageHasMore);
        setWardrobeTypeBucket(
          currentTypeId,
          { items: nextItems, hasMore: pageHasMore },
          typesRef.current,
        );
        const typeName =
          typesRef.current.find((type) => type._id === currentTypeId)?.name ??
          "";
        consumeInboundRefreshTypes({
          typeIds: [currentTypeId],
          typeNames: typeName ? [typeName] : [],
        });
      } else {
        typeIdsToInvalidate.forEach((typeId) => {
          clearWardrobeTypeBucket(typeId);
        });
        const nextItems = await fetchWardrobeItems({
          typeId: null,
          skip: 0,
          limit: WARDROBE_PAGE_SIZE,
        });
        if (seq !== requestSeqRef.current) return;
        const pageHasMore = nextItems.length >= WARDROBE_PAGE_SIZE;
        setItems(nextItems);
        setHasMore(pageHasMore);
        setWardrobeTypeBucket(
          null,
          { items: nextItems, hasMore: pageHasMore },
          typesRef.current,
        );
        clearInboundRefresh();
      }
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      const message =
        err instanceof Error ? err.message : "衣橱刷新失败，请稍后重试";
      Taro.showToast({ title: message, icon: "none" });
    } finally {
      if (seq === requestSeqRef.current) {
        loadingRef.current = false;
        setListLoading(false);
        setInitialLoading(false);
      }
      refreshHintLoadingRef.current = false;
      setRefreshHintLoading(false);
    }
  }, [inboundRefresh, loadTypes]);

  const closeActionSheet = useCallback(() => {
    setActionSheetVisible(false);
    setSelectedItem(null);
  }, []);

  const handleItemLongPress = useCallback((item: WardrobeItem) => {
    setSelectedItem(item);
    setActionSheetVisible(true);
  }, []);

  const handleItemClick = useCallback((item: WardrobeItem) => {
    Taro.navigateTo({
      url: `/pages/wardrobe-detail/index?id=${item._id}`,
    });
  }, []);

  const handleItemImageError = useCallback(async (item: WardrobeItem) => {
    const fileId = item.imageFileId;
    if (!fileId || imageRetriedRef.current.has(fileId)) return;
    if (loadingRef.current) return;
    imageRetriedRef.current.add(fileId);

    try {
      const url = await resolveCloudFileUrl(fileId);
      if (!url) return;
      const imageUrlAt = Date.now();
      setItems((prev) =>
        prev.map((i) =>
          i.imageFileId === fileId ? { ...i, imageUrl: url, imageUrlAt } : i,
        ),
      );
      updateWardrobeCacheItemUrl(item._id, url, imageUrlAt, item.typeId);
      putImageUrlCache("wardrobe", fileId, url, imageUrlAt);
    } catch {
      // 兜底失败不打扰用户
    }
  }, []);

  const handleDeleteItem = useCallback(
    async (item: WardrobeItem) => {
      if (deleting) return;

      if (!isWeapp()) {
        Taro.showToast({ title: "请在微信小程序中使用", icon: "none" });
        return;
      }

      const modalRes = await Taro.showModal({
        title: "确认删除",
        content: `确定要删除「${item.name}」吗？此操作不可恢复。`,
        confirmText: "删除",
        confirmColor: "#fa2c19",
      });

      if (!modalRes.confirm) return;

      setDeleting(true);
      try {
        await deleteWardrobeItem(item);
        removeItemFromWardrobeCache(item._id, item.typeId);
        if (item.imageFileId) {
          removeImageUrlCache("wardrobe", item.imageFileId);
        }
        const types = getClothingTypesFromCache();
        typesRef.current = types;
        setClothingTypes(types);
        setItems((prev) => prev.filter((i) => i._id !== item._id));
        Taro.showToast({ title: "已删除", icon: "success" });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "删除失败，请稍后重试";
        Taro.showToast({ title: message, icon: "none" });
      } finally {
        setDeleting(false);
      }
    },
    [deleting],
  );

  const handleActionSelect = useCallback(
    (option: { name?: string }) => {
      const item = selectedItem;
      closeActionSheet();
      if (!item) return;

      switch (option.name) {
        case "查看":
          handleItemClick(item);
          break;
        case "编辑":
          Taro.navigateTo({
            url: `/pages/wardrobe-edit/index?id=${item._id}`,
          });
          break;
        case "删除":
          void handleDeleteItem(item);
          break;
        default:
          break;
      }
    },
    [closeActionSheet, handleDeleteItem, handleItemClick, selectedItem],
  );

  return {
    clothingTypes,
    items,
    setItems,
    activeTab,
    activeTypeId,
    tabTitles,
    hasMore,
    listLoading,
    initialLoading,
    actionSheetVisible,
    showRefreshHint,
    refreshHintTypeNames,
    refreshHintLoading,
    loadTypes,
    handleTypeChange,
    handleScrollToLower,
    handleRefreshHintClick,
    closeActionSheet,
    handleItemLongPress,
    handleItemClick,
    handleItemImageError,
    handleActionSelect,
  };
}
