import { useCallback, useMemo, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { Add } from "@nutui/icons-react-taro";
import { Image, Loading, Tabs } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import type { WardrobeItem } from "@/data/wardrobe";
import { useMainTabNavigation } from "@/hooks/useMainTabNavigation";
import Main from "@/layouts/Main";
import {
  peekTryOnDraft,
  setTryOnDraft,
} from "@/services/tryOnDraft";
import {
  fetchClothingTypes,
  fetchWardrobeItems,
  fetchWardrobeItemsGroupedByType,
} from "@/services/wardrobe";
import {
  arePieceSelectionsEqual,
  getPieceIds,
} from "@/utils/outfitSelection";
import MatchItemCard from "./components/MatchItemCard";
import "./index.scss";

function OutfitPage() {
  const { activeTab, onTabChange } = useMainTabNavigation(2);
  const [typeNames, setTypeNames] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [itemsByType, setItemsByType] = useState<
    Record<string, WardrobeItem[]>
  >({});
  const [outfitByCategory, setOutfitByCategory] = useState<
    Record<string, WardrobeItem>
  >({});
  const [outfitName, setOutfitName] = useState("我的搭配");
  const [baselinePieceIds, setBaselinePieceIds] = useState<string[]>([]);
  const [fromTryOnEdit, setFromTryOnEdit] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);

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
      setOutfitName(draft.outfitName ?? "我的搭配");
      setBaselinePieceIds(
        draft.baselinePieceIds ?? getPieceIds(draft.selectedPieces),
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
    [itemsByType, activeCategory],
  );

  const outfitPieces = useMemo(
    () => typeNames.map((cat) => outfitByCategory[cat]).filter(Boolean),
    [typeNames, outfitByCategory],
  );

  const handleToggleItem = (item: WardrobeItem) => {
    setOutfitByCategory((prev) => {
      const current = prev[item.typeName];
      if (current?._id === item._id) {
        const next = { ...prev };
        delete next[item.typeName];
        return next;
      }
      return { ...prev, [item.typeName]: item };
    });
  };

  const handleRemovePiece = (item: WardrobeItem) => {
    setOutfitByCategory((prev) => {
      const next = { ...prev };
      delete next[item.typeName];
      return next;
    });
  };

  const handleSaveOutfit = () => {
    if (outfitPieces.length === 0) {
      Taro.showToast({ title: "请先选择单品", icon: "none" });
      return;
    }

    if (fromTryOnEdit) {
      const currentIds = getPieceIds(outfitPieces);
      const piecesChanged = !arePieceSelectionsEqual(
        baselinePieceIds,
        currentIds,
      );
      setTryOnDraft({
        mode: "saved",
        outfitName,
        selectedPieces: outfitPieces,
        piecesChanged,
      });
      Taro.redirectTo({ url: "/pages/try-on/index" });
      return;
    }

    Taro.showToast({ title: "搭配已保存", icon: "success" });
  };

  const handleAddPiece = () => {
    Taro.showToast({ title: "从上方列表选择单品", icon: "none" });
  };

  const handleCategoryChange = async (index: number) => {
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
  };

  return (
    <Main
      activeTab={activeTab}
      onTabChange={onTabChange}
      scrollClassName="main-scroll--outfit"
      header={<AppNavbar />}
    >
      <Main.Scroll>
        {initialLoading ? (
          <View className="outfit-loading">
            <Loading type="circular" />
          </View>
        ) : (
          <>
            <Tabs
              value={activeCategoryIndex}
              activeType="button"
              className="category-tabs"
              onChange={(v) => handleCategoryChange(v as number)}
            >
              {typeNames.map((cat, idx) => (
                <Tabs.TabPane key={cat} title={cat} value={idx} />
              ))}
            </Tabs>

            <View className="match-grid">
              {listLoading ? (
                <View className="outfit-loading outfit-loading--inline">
                  <Loading type="circular" />
                </View>
              ) : filteredItems.length === 0 ? (
                <View className="outfit-empty-hint">
                  <Text>该分类暂无单品</Text>
                </View>
              ) : (
                filteredItems.map((item) => (
                  <MatchItemCard
                    key={item._id}
                    item={item}
                    selected={outfitByCategory[item.typeName]?._id === item._id}
                    onToggle={handleToggleItem}
                  />
                ))
              )}
            </View>
          </>
        )}
      </Main.Scroll>

      <View className="outfit-panel">
        <View className="outfit-panel__card">
          <View className="outfit-panel__header">
            <View className="outfit-panel__info">
              <Text className="outfit-panel__title">当前搭配</Text>
              <Text className="outfit-panel__desc">
                已选 {outfitPieces.length} 件单品 • 「{outfitName}」
              </Text>
            </View>
            <View className="outfit-panel__save" onClick={handleSaveOutfit}>
              <Text className="outfit-panel__save-text">保存搭配</Text>
            </View>
          </View>
          <View className="outfit-panel__thumbs">
            <View className="outfit-panel__thumbs-inner">
              {outfitPieces.map((piece) => (
                <View key={piece._id} className="outfit-thumb">
                  <View className="outfit-thumb__box">
                    <View className="outfit-thumb__media">
                      <Image
                        className="outfit-thumb__image"
                        src={piece.imageUrl ?? ""}
                        mode="aspectFill"
                      />
                    </View>
                    <View
                      className="outfit-thumb__remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePiece(piece);
                      }}
                    >
                      <Text className="outfit-thumb__remove-icon">×</Text>
                    </View>
                  </View>
                </View>
              ))}
              <View
                className="outfit-thumb outfit-thumb--add"
                onClick={handleAddPiece}
              >
                <Add size={20} color="var(--nutui-gray-5)" />
                <Text className="outfit-thumb__add-label">添加单品</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Main>
  );
}

export default OutfitPage;
