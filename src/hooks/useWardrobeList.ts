import { useCallback, useMemo, useRef, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import type { AiStatus, ClothingType, WardrobeItem } from "@/data/wardrobe";
import { WARDROBE_PAGE_SIZE, isAiBusy } from "@/data/wardrobe";
import {
  deleteWardrobeItem,
  fetchClothingTypes,
  fetchWardrobeItemCount,
  fetchWardrobeItems,
} from "@/services/wardrobe";

interface UseWardrobeListOptions {
  uploadFlowRef: React.MutableRefObject<boolean>;
  setAiStatus: React.Dispatch<React.SetStateAction<AiStatus>>;
}

export function useWardrobeList({
  uploadFlowRef,
  setAiStatus,
}: UseWardrobeListOptions) {
  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>([]);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadingRef = useRef(false);
  const itemsRef = useRef<WardrobeItem[]>([]);
  itemsRef.current = items;

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
    setClothingTypes(types);
    return types;
  }, []);

  const loadItems = useCallback(
    async (options: { reset?: boolean; typeId?: string | null } = {}) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

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
        });

        setItems((prev) => (reset ? nextItems : [...prev, ...nextItems]));
        setHasMore(nextItems.length >= WARDROBE_PAGE_SIZE);
      } catch (err) {
        const message = err instanceof Error ? err.message : "加载失败";
        Taro.showToast({ title: message, icon: "none" });
      } finally {
        loadingRef.current = false;
        setListLoading(false);
        setInitialLoading(false);
      }
    },
    [activeTypeId],
  );

  const refreshWardrobe = useCallback(async () => {
    try {
      const [totalCount] = await Promise.all([
        fetchWardrobeItemCount(),
        loadTypes(),
      ]);
      setAiStatus((prev) =>
        isAiBusy(prev.phase) ? prev : { ...prev, totalCount, phase: "idle" },
      );
      await loadItems({ reset: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载失败";
      Taro.showToast({ title: message, icon: "none" });
      setInitialLoading(false);
    }
  }, [loadItems, loadTypes, setAiStatus]);

  useDidShow(() => {
    if (process.env.TARO_ENV !== "weapp") {
      setInitialLoading(false);
      return;
    }
    if (uploadFlowRef.current) return;
    refreshWardrobe();
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
        setAiStatus((prev) =>
          isAiBusy(prev.phase)
            ? prev
            : { ...prev, totalCount: Math.max(0, prev.totalCount - 1) },
        );
        Taro.showToast({ title: "已删除", icon: "success" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "删除失败";
        Taro.showToast({ title: message, icon: "none" });
      } finally {
        setDeleting(false);
      }
    },
    [deleting, setAiStatus],
  );

  const handleActionSelect = useCallback(
    (option: { name?: string }) => {
      const item = selectedItem;
      closeActionSheet();
      if (!item) return;

      switch (option.name) {
        case "查看":
          Taro.navigateTo({
            url: `/pages/wardrobe-detail/index?id=${item._id}`,
          });
          break;
        case "编辑":
          Taro.showToast({ title: "编辑功能即将上线", icon: "none" });
          break;
        case "删除":
          void handleDeleteItem(item);
          break;
        default:
          break;
      }
    },
    [closeActionSheet, handleDeleteItem, selectedItem],
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
    handleActionSelect,
  };
}
