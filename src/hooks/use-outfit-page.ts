import { ClothingType, WardrobeItem } from "@/types/wardrobe";
import { WARDROBE_PAGE_SIZE } from "@/constants/wardrobe";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";


import {
  consumeInboundRefreshTypes,
  getInboundRefresh,
  subscribeInboundRefresh,
  type InboundRefreshPayload,
} from "@/services/recognition-inbound-cache";
import { peekTryOnDraft, setTryOnDraft } from "@/services/try-on-draft";
import { getInitialTryOnCache } from "@/services/try-on-cache";
import { fetchClothingTypes, fetchWardrobeItems } from "@/services/wardrobe";
import {
  appendWardrobeTypeBucket,
  clearWardrobeTypeBucket,
  getClothingTypesFromCache,
  getInitialOutfitState,
  getWardrobeTypeBucket,
  hasWardrobeTypeCache,
  setClothingTypesInCache,
  setOutfitActiveTypeKey,
  setWardrobeTypeBucket,
} from "@/services/wardrobe-cache";
import { isWeapp } from "@/utils/platform";
import { arePieceSelectionsEqual, getPieceIds } from "@/utils/outfit-selection";

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

function isWardrobeEmptyByTypes(types: ClothingType[]): boolean {
  if (types.length === 0) return true;
  return types.every((type) => type.itemCount === 0);
}

/** 无缓存自动拉取前：命中入库信号的具体分类时清「全部」桶 */
function prepareInboundForNoCacheLoad(typeId: string | null): void {
  const signal = getInboundRefresh();
  if (!signal || !typeId) return;
  if (!signal.typeIds.includes(typeId)) return;
  clearWardrobeTypeBucket(null);
}

/** 无缓存自动拉取成功后：消费对应入库信号 */
function settleInboundAfterNoCacheLoad(typeId: string | null): void {
  const signal = getInboundRefresh();
  if (!signal || !typeId) return;
  if (!signal.typeIds.includes(typeId)) return;
  const typeName =
    getClothingTypesFromCache().find((type) => type._id === typeId)?.name ?? "";
  consumeInboundRefreshTypes({
    typeIds: [typeId],
    typeNames: typeName ? [typeName] : [],
  });
}

export function useOutfitPage() {
  const [initial] = useState(getInitialOutfitState);
  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>(
    initial.clothingTypes,
  );
  const [activeTypeId, setActiveTypeId] = useState<string | null>(
    initial.activeTypeId,
  );
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(
    initial.activeCategoryIndex,
  );
  const [items, setItems] = useState<WardrobeItem[]>(initial.items);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [outfitByCategory, setOutfitByCategory] = useState<
    Record<string, WardrobeItem>
  >({});
  const [baselinePieceIds, setBaselinePieceIds] = useState<string[]>([]);
  const [fromTryOnEdit, setFromTryOnEdit] = useState(false);
  const [initialLoading, setInitialLoading] = useState(
    !(
      initial.hasCache ||
      (initial.wardrobeEmpty && initial.clothingTypes.length > 0)
    ),
  );
  const [listLoading, setListLoading] = useState(false);
  const [wardrobeEmpty, setWardrobeEmpty] = useState(initial.wardrobeEmpty);
  const [inboundRefresh, setInboundRefreshState] =
    useState<InboundRefreshPayload | null>(null);
  const [refreshHintLoading, setRefreshHintLoading] = useState(false);

  const loadingRef = useRef(false);
  const itemsRef = useRef<WardrobeItem[]>([]);
  itemsRef.current = items;
  const typesRef = useRef<ClothingType[]>(initial.clothingTypes);
  const activeTypeIdRef = useRef<string | null>(initial.activeTypeId);
  activeTypeIdRef.current = activeTypeId;
  const requestSeqRef = useRef(0);
  const bootstrappedRef = useRef(false);
  const refreshHintLoadingRef = useRef(false);

  const typeNames = useMemo(
    () => clothingTypes.map((type) => type.name).filter(Boolean),
    [clothingTypes],
  );

  const showRefreshHint = useMemo(() => {
    if (!inboundRefresh || !activeTypeId) return false;
    if (!hasWardrobeTypeCache(activeTypeId)) return false;
    return inboundRefresh.typeIds.includes(activeTypeId);
  }, [activeTypeId, inboundRefresh]);

  const refreshHintTypeNames = useMemo(() => {
    if (!inboundRefresh || !activeTypeId) return [];
    const name = clothingTypes.find((type) => type._id === activeTypeId)?.name;
    return name ? [name] : inboundRefresh.typeNames;
  }, [activeTypeId, clothingTypes, inboundRefresh]);

  useEffect(() => {
    return subscribeInboundRefresh(setInboundRefreshState);
  }, []);

  const loadTypes = useCallback(async () => {
    const types = await fetchClothingTypes();
    typesRef.current = types;
    setClothingTypesInCache(types);
    setClothingTypes((prev) => (isSameTypes(prev, types) ? prev : types));
    setWardrobeEmpty(isWardrobeEmptyByTypes(types));
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
      const typeId =
        options.typeId !== undefined ? options.typeId : activeTypeIdRef.current;
      if (!typeId) return false;

      loadingRef.current = true;
      const seq = ++requestSeqRef.current;
      const reset = options.reset ?? false;

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
          err instanceof Error ? err.message : "搭配列表加载失败，请稍后重试";
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
    [],
  );

  const applyCategoryState = useCallback(
    (typeId: string, categoryIndex: number) => {
      setActiveTypeId(typeId);
      setActiveCategoryIndex(categoryIndex);
      setOutfitActiveTypeKey(typeId);
      activeTypeIdRef.current = typeId;
    },
    [],
  );

  /** 冷启动 / remount：仅当当前分类无缓存时拉取 */
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    if (!isWeapp()) {
      setInitialLoading(false);
      return;
    }

    if (initial.wardrobeEmpty && initial.clothingTypes.length > 0) {
      setInitialLoading(false);
      return;
    }

    if (initial.hasCache) {
      setInitialLoading(false);
      return;
    }

    void (async () => {
      try {
        let types = getClothingTypesFromCache();
        if (types.length === 0) {
          types = await loadTypes();
        } else {
          typesRef.current = types;
          setWardrobeEmpty(isWardrobeEmptyByTypes(types));
        }

        if (isWardrobeEmptyByTypes(types)) {
          setInitialLoading(false);
          return;
        }

        let typeId = activeTypeIdRef.current;
        let categoryIndex = 0;
        if (!typeId || !types.some((type) => type._id === typeId)) {
          typeId = types[0]._id;
          categoryIndex = 0;
          applyCategoryState(typeId, categoryIndex);
        } else {
          categoryIndex = types.findIndex((type) => type._id === typeId);
          applyCategoryState(typeId, Math.max(0, categoryIndex));
        }

        if (hasWardrobeTypeCache(typeId)) {
          const bucket = getWardrobeTypeBucket(typeId);
          setItems(bucket?.items ?? []);
          setHasMore(bucket?.hasMore ?? false);
          setInitialLoading(false);
          return;
        }

        prepareInboundForNoCacheLoad(typeId);
        const ok = await loadItems({ reset: true, typeId });
        if (ok) settleInboundAfterNoCacheLoad(typeId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "搭配列表加载失败，请稍后重试";
        Taro.showToast({ title: message, icon: "none" });
        setInitialLoading(false);
      }
    })();
  }, [applyCategoryState, initial, loadItems, loadTypes]);

  useDidShow(() => {
    const draft = peekTryOnDraft();
    if (draft?.mode === "edit" && draft.selectedPieces) {
      const byCat: Record<string, WardrobeItem> = {};
      draft.selectedPieces.forEach((piece) => {
        byCat[piece.typeName] = piece;
      });
      setOutfitByCategory(byCat);
      setBaselinePieceIds(
        draft.baselinePieceIds ?? getPieceIds(draft.selectedPieces),
      );
      setFromTryOnEdit(true);
    } else {
      setFromTryOnEdit(false);
      setBaselinePieceIds([]);
    }

    if (!isWeapp()) return;

    const types = getClothingTypesFromCache();
    if (types.length > 0) {
      typesRef.current = types;
      setClothingTypes((prev) => (isSameTypes(prev, types) ? prev : types));
      setWardrobeEmpty(isWardrobeEmptyByTypes(types));

      let typeId = activeTypeIdRef.current;
      if (!typeId || !types.some((type) => type._id === typeId)) {
        typeId = types[0]._id;
        applyCategoryState(typeId, 0);
      }

      if (hasWardrobeTypeCache(typeId)) {
        const bucket = getWardrobeTypeBucket(typeId);
        setItems(bucket?.items ?? []);
        setHasMore(bucket?.hasMore ?? false);
        setInitialLoading(false);
      }
      return;
    }

    const typeId = activeTypeIdRef.current;
    if (!typeId) return;

    if (hasWardrobeTypeCache(typeId)) {
      const bucket = getWardrobeTypeBucket(typeId);
      setItems(bucket?.items ?? []);
      setHasMore(bucket?.hasMore ?? false);
      setInitialLoading(false);
    }
  });

  const outfitPieces = useMemo(
    () => typeNames.map((cat) => outfitByCategory[cat]).filter(Boolean),
    [typeNames, outfitByCategory],
  );

  const handleToggleItem = useCallback((item: WardrobeItem) => {
    setOutfitByCategory((prev) => {
      const current = prev[item.typeName];
      if (current?._id === item._id) {
        const next = { ...prev };
        delete next[item.typeName];
        return next;
      }
      return { ...prev, [item.typeName]: item };
    });
  }, []);

  const handleRemovePiece = useCallback((item: WardrobeItem) => {
    setOutfitByCategory((prev) => {
      const next = { ...prev };
      delete next[item.typeName];
      return next;
    });
  }, []);

  const handleSaveOutfit = useCallback(() => {
    if (outfitPieces.length === 0) {
      Taro.showToast({ title: "请先选择单品", icon: "none" });
      return;
    }

    const currentIds = getPieceIds(outfitPieces);

    if (fromTryOnEdit) {
      const piecesChanged = !arePieceSelectionsEqual(
        baselinePieceIds,
        currentIds,
      );
      setTryOnDraft({
        mode: "saved",
        selectedPieces: outfitPieces,
        piecesChanged,
      });
      Taro.redirectTo({ url: "/pages/try-on/index" });
      return;
    }

    const cache = getInitialTryOnCache();
    const baselineIds = cache ? getPieceIds(cache.selectedPieces) : [];
    const piecesChanged = !arePieceSelectionsEqual(baselineIds, currentIds);

    setTryOnDraft({
      mode: "saved",
      selectedPieces: outfitPieces,
      piecesChanged,
    });
    Taro.redirectTo({ url: "/pages/try-on/index" });
  }, [outfitPieces, fromTryOnEdit, baselinePieceIds]);

  const handleGoWardrobe = useCallback(() => {
    Taro.redirectTo({ url: "/pages/wardrobe/index" });
  }, []);

  const handleCategoryChange = useCallback(
    async (index: number) => {
      const type = clothingTypes[index];
      if (!type) return;

      applyCategoryState(type._id, index);

      if (hasWardrobeTypeCache(type._id)) {
        const bucket = getWardrobeTypeBucket(type._id);
        setItems(bucket?.items ?? []);
        setHasMore(bucket?.hasMore ?? false);
        setInitialLoading(false);
        return;
      }

      setItems([]);
      setHasMore(true);
      loadingRef.current = false;
      prepareInboundForNoCacheLoad(type._id);
      const ok = await loadItems({ reset: true, typeId: type._id });
      if (ok) settleInboundAfterNoCacheLoad(type._id);
    },
    [applyCategoryState, clothingTypes, loadItems],
  );

  const handleScrollToLower = useCallback(() => {
    if (!hasMore || listLoading || initialLoading || loadingRef.current) return;
    void loadItems();
  }, [hasMore, initialLoading, listLoading, loadItems]);

  const handleRefreshHintClick = useCallback(async () => {
    if (!isWeapp()) return;
    if (refreshHintLoadingRef.current || !inboundRefresh) return;

    const currentTypeId = activeTypeIdRef.current;
    if (!currentTypeId) return;

    refreshHintLoadingRef.current = true;
    setRefreshHintLoading(true);
    loadingRef.current = true;
    const seq = ++requestSeqRef.current;
    setInitialLoading(true);

    try {
      await loadTypes();
      clearWardrobeTypeBucket(null);
      clearWardrobeTypeBucket(currentTypeId);

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
        typesRef.current.find((type) => type._id === currentTypeId)?.name ?? "";
      consumeInboundRefreshTypes({
        typeIds: [currentTypeId],
        typeNames: typeName ? [typeName] : [],
      });
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      const message =
        err instanceof Error ? err.message : "搭配列表刷新失败，请稍后重试";
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

  return {
    typeNames,
    activeCategoryIndex,
    filteredItems: items,
    outfitPieces,
    initialLoading,
    listLoading,
    wardrobeEmpty,
    outfitByCategory,
    showRefreshHint,
    refreshHintTypeNames,
    refreshHintLoading,
    handleToggleItem,
    handleRemovePiece,
    handleSaveOutfit,
    handleCategoryChange,
    handleScrollToLower,
    handleRefreshHintClick,
    handleGoWardrobe,
  };
}
