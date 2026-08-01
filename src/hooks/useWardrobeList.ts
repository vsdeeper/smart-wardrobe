import { useCallback, useMemo, useRef, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import type { ClothingType, WardrobeItem } from "@/data/wardrobe";
import { WARDROBE_PAGE_SIZE } from "@/data/wardrobe";
import {
  deleteWardrobeItem,
  fetchClothingTypes,
  fetchWardrobeItems,
  resolveCloudFileUrl,
} from "@/services/wardrobe";
import {
  getInitialWardrobeState,
  readWardrobeCache,
  removeItemFromWardrobeCache,
  updateWardrobeCacheItemUrl,
  writeWardrobeCache,
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

export function useWardrobeList({ uploadFlowRef }: UseWardrobeListOptions) {
  const [initial] = useState(getInitialWardrobeState);
  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>(
    initial.clothingTypes,
  );
  const [items, setItems] = useState<WardrobeItem[]>(initial.items);
  const [activeTab, setActiveTab] = useState(0);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [listLoading, setListLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!initial.hasCache);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadingRef = useRef(false);
  const itemsRef = useRef<WardrobeItem[]>([]);
  itemsRef.current = items;
  /** 最近一次拉取到的类型列表，供写缓存时取用（setState 后同轮读不到新值） */
  const typesRef = useRef<ClothingType[]>(initial.clothingTypes);
  /** 已尝试重解析过的 imageFileId，避免坏链反复触发 onError 造成循环请求 */
  const imageRetriedRef = useRef<Set<string>>(new Set());
  /** 请求序号：静默刷新期间切换分类会并发两次请求，只允许最新一次落地 */
  const requestSeqRef = useRef(0);

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

  const loadTypes = useCallback(async () => {
    const types = await fetchClothingTypes();
    typesRef.current = types;
    setClothingTypes((prev) => (isSameTypes(prev, types) ? prev : types));
    return types;
  }, []);

  const loadItems = useCallback(
    async (
      options: {
        reset?: boolean;
        typeId?: string | null;
        /** 静默刷新：不改动 loading 状态，页面保持展示已有数据 */
        silent?: boolean;
      } = {},
    ) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      const seq = ++requestSeqRef.current;
      const reset = options.reset ?? false;
      const silent = options.silent ?? false;
      const typeId =
        options.typeId !== undefined ? options.typeId : activeTypeId;

      if (!silent) {
        if (reset) {
          setInitialLoading(true);
        } else {
          setListLoading(true);
        }
      }

      try {
        const skip = reset ? 0 : itemsRef.current.length;
        const nextItems = await fetchWardrobeItems({
          typeId,
          skip: reset ? 0 : skip,
          limit: WARDROBE_PAGE_SIZE,
        });

        if (seq !== requestSeqRef.current) return;

        setItems((prev) => (reset ? nextItems : [...prev, ...nextItems]));
        setHasMore(nextItems.length >= WARDROBE_PAGE_SIZE);

        if (reset && typeId === null) {
          writeWardrobeCache({
            clothingTypes: typesRef.current,
            items: nextItems,
            cachedAt: Date.now(),
          });
        }
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        if (!silent || itemsRef.current.length === 0) {
          const message =
            err instanceof Error ? err.message : "衣橱加载失败，请稍后重试";
          Taro.showToast({ title: message, icon: "none" });
        }
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

  const refreshWardrobe = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const silent = options.silent ?? false;
      try {
        await loadTypes();
        await loadItems({ reset: true, silent });
      } catch (err) {
        if (!silent || itemsRef.current.length === 0) {
          const message =
            err instanceof Error ? err.message : "衣橱加载失败，请稍后重试";
          Taro.showToast({ title: message, icon: "none" });
        }
        setInitialLoading(false);
      }
    },
    [loadItems, loadTypes],
  );

  useDidShow(() => {
    if (process.env.TARO_ENV !== "weapp") {
      setInitialLoading(false);
      return;
    }
    if (uploadFlowRef.current) return;
    // 有缓存说明页面已渲染出上次的数据（含空衣橱），此时刷新对用户无感
    refreshWardrobe({ silent: readWardrobeCache() !== null });
  });

  const handleTypeChange = useCallback(
    async (value: string | number) => {
      const nextTab = value as number;
      setActiveTab(nextTab);
      setItems([]);
      setHasMore(true);

      const typeId =
        nextTab === 0 ? null : (clothingTypes[nextTab - 1]?._id ?? null);
      loadingRef.current = false;
      await loadItems({ reset: true, typeId });
    },
    [clothingTypes, loadItems],
  );

  const handleScrollToLower = useCallback(() => {
    if (!hasMore || listLoading || initialLoading || loadingRef.current) return;
    loadItems();
  }, [hasMore, initialLoading, listLoading, loadItems]);

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

  /** 临时链接失效时的兜底：单图重解析，不依赖 TTL 估算 */
  const handleItemImageError = useCallback(async (item: WardrobeItem) => {
    const fileId = item.imageFileId;
    if (!fileId || imageRetriedRef.current.has(fileId)) return;
    // 列表请求进行中时，整批 URL 马上会被刷新覆盖，无需逐图重解析
    if (loadingRef.current) return;
    imageRetriedRef.current.add(fileId);

    try {
      const url = await resolveCloudFileUrl(fileId);
      if (!url) return;
      setItems((prev) =>
        prev.map((i) =>
          i.imageFileId === fileId ? { ...i, imageUrl: url } : i,
        ),
      );
      updateWardrobeCacheItemUrl(item._id, url);
    } catch {
      // 兜底失败不打扰用户，等下次进入页面刷新
    }
  }, []);

  const handleDeleteItem = useCallback(
    async (item: WardrobeItem) => {
      if (deleting) return;

      if (process.env.TARO_ENV !== "weapp") {
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
        setItems((prev) => prev.filter((i) => i._id !== item._id));
        setClothingTypes((prev) =>
          prev.map((type) =>
            type._id === item.typeId
              ? { ...type, itemCount: Math.max(0, type.itemCount - 1) }
              : type,
          ),
        );
        removeItemFromWardrobeCache(item._id, item.typeId);
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
    loadTypes,
    refreshWardrobe,
    handleTypeChange,
    handleScrollToLower,
    closeActionSheet,
    handleItemLongPress,
    handleItemClick,
    handleItemImageError,
    handleActionSelect,
  };
}
