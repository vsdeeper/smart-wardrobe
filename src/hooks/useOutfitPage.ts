import { useCallback, useMemo, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import type { WardrobeItem } from "@/data/wardrobe";
import { peekTryOnDraft, setTryOnDraft } from "@/services/tryOnDraft";
import { getInitialTryOnCache } from "@/services/tryOnCache";
import {
  fetchClothingTypes,
  fetchWardrobeItems,
  fetchWardrobeItemsGroupedByType,
} from "@/services/wardrobe";
import { arePieceSelectionsEqual, getPieceIds } from "@/utils/outfitSelection";

export function useOutfitPage() {
  const [typeNames, setTypeNames] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [itemsByType, setItemsByType] = useState<
    Record<string, WardrobeItem[]>
  >({});
  const [outfitByCategory, setOutfitByCategory] = useState<
    Record<string, WardrobeItem>
  >({});
  const [baselinePieceIds, setBaselinePieceIds] = useState<string[]>([]);
  const [fromTryOnEdit, setFromTryOnEdit] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [wardrobeEmpty, setWardrobeEmpty] = useState(false);

  const loadTypesAndItems = useCallback(async () => {
    setInitialLoading(true);
    try {
      const types = await fetchClothingTypes();
      let names = types.map((t) => t.name).filter(Boolean);
      const grouped: Record<string, WardrobeItem[]> = {};

      if (names.length === 0) {
        const { byType } = await fetchWardrobeItemsGroupedByType();
        Object.assign(grouped, byType);
        names = Object.keys(byType);
      } else {
        for (const name of names) {
          const typeDoc = types.find((t) => t.name === name);
          grouped[name] = await fetchWardrobeItems({
            typeId: typeDoc?._id ?? null,
            skip: 0,
            limit: 50,
          });
        }
      }

      const hasItems = Object.values(grouped).some((list) => list.length > 0);
      setWardrobeEmpty(!hasItems);
      setTypeNames(names.length > 0 ? names : ["上装"]);
      setActiveCategory((prev) => prev || names[0] || "上装");
      setItemsByType(grouped);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useDidShow(() => {
    const draft = peekTryOnDraft();
    if (draft?.mode === "edit" && draft.selectedPieces) {
      const byCat: Record<string, WardrobeItem> = {};
      draft.selectedPieces.forEach((piece) => {
        byCat[piece.typeName] = piece;
      });
      setOutfitByCategory(byCat);
      setBaselinePieceIds(
        draft.baselinePieceIds ?? getPieceIds(draft.selectedPieces)
      );
      setFromTryOnEdit(true);
    } else {
      setFromTryOnEdit(false);
      setBaselinePieceIds([]);
    }
    loadTypesAndItems();
  });

  const activeCategoryIndex = Math.max(0, typeNames.indexOf(activeCategory));

  const filteredItems = useMemo(
    () => itemsByType[activeCategory] ?? [],
    [itemsByType, activeCategory]
  );

  const outfitPieces = useMemo(
    () => typeNames.map((cat) => outfitByCategory[cat]).filter(Boolean),
    [typeNames, outfitByCategory]
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
        currentIds
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
      const cat = typeNames[index];
      if (!cat) return;
      setActiveCategory(cat);
      if (itemsByType[cat]?.length) return;

      setListLoading(true);
      try {
        const types = await fetchClothingTypes();
        const typeDoc = types.find((t) => t.name === cat);
        const items = await fetchWardrobeItems({
          typeId: typeDoc?._id ?? null,
          skip: 0,
          limit: 50,
        });
        setItemsByType((prev) => ({ ...prev, [cat]: items }));
      } finally {
        setListLoading(false);
      }
    },
    [typeNames, itemsByType]
  );

  return {
    typeNames,
    activeCategoryIndex,
    filteredItems,
    outfitPieces,
    initialLoading,
    listLoading,
    wardrobeEmpty,
    outfitByCategory,
    handleToggleItem,
    handleRemovePiece,
    handleSaveOutfit,
    handleCategoryChange,
    handleGoWardrobe,
  };
}
