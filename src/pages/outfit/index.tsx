import { useMemo, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Add } from "@nutui/icons-react-taro";
import { Image, Tabs } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import Main from "@/layouts/Main";
import {
  INITIAL_OUTFIT_IDS,
  MATCH_ITEMS,
  OUTFIT_CATEGORIES,
  OUTFIT_NAME,
  type MatchItem,
  type OutfitCategory,
} from "@/data/mock/outfit";
import { useMainTabNavigation } from "@/hooks/useMainTabNavigation";
import MatchItemCard from "./components/MatchItemCard";
import "./index.scss";

function OutfitPage() {
  const { activeTab, onTabChange } = useMainTabNavigation(2);
  const [activeCategory, setActiveCategory] = useState<OutfitCategory>("上装");
  const [outfitByCategory, setOutfitByCategory] = useState<
    Partial<Record<OutfitCategory, MatchItem>>
  >(() => {
    const initial: Partial<Record<OutfitCategory, MatchItem>> = {};
    INITIAL_OUTFIT_IDS.forEach((id) => {
      const item = MATCH_ITEMS.find((m) => m.id === id);
      if (item) initial[item.category] = item;
    });
    return initial;
  });

  const activeCategoryIndex = OUTFIT_CATEGORIES.indexOf(activeCategory);

  const filteredItems = useMemo(
    () => MATCH_ITEMS.filter((item) => item.category === activeCategory),
    [activeCategory],
  );

  const outfitPieces = useMemo(
    () =>
      OUTFIT_CATEGORIES.map((cat) => outfitByCategory[cat]).filter(
        (item): item is MatchItem => Boolean(item),
      ),
    [outfitByCategory],
  );

  const handleToggleItem = (item: MatchItem) => {
    setOutfitByCategory((prev) => {
      const current = prev[item.category];
      if (current?.id === item.id) {
        const next = { ...prev };
        delete next[item.category];
        return next;
      }
      return { ...prev, [item.category]: item };
    });
  };

  const handleRemovePiece = (item: MatchItem) => {
    setOutfitByCategory((prev) => {
      const next = { ...prev };
      delete next[item.category];
      return next;
    });
  };

  const handleSaveOutfit = () => {
    if (outfitPieces.length === 0) {
      Taro.showToast({ title: "请先选择单品", icon: "none" });
      return;
    }
    Taro.showToast({ title: "搭配已保存", icon: "success" });
  };

  const handleAddPiece = () => {
    Taro.showToast({ title: "从上方列表选择单品", icon: "none" });
  };

  return (
    <Main
      activeTab={activeTab}
      onTabChange={onTabChange}
      scrollClassName="main-scroll--outfit"
      header={<AppNavbar />}
    >
      <Main.Scroll>
        <Tabs
          value={activeCategoryIndex}
          activeType="button"
          className="category-tabs"
          onChange={(v) => setActiveCategory(OUTFIT_CATEGORIES[v as number])}
        >
          {OUTFIT_CATEGORIES.map((cat, idx) => (
            <Tabs.TabPane key={cat} title={cat} value={idx} />
          ))}
        </Tabs>

        <View className="match-grid">
          {filteredItems.map((item) => (
            <MatchItemCard
              key={item.id}
              item={item}
              selected={outfitByCategory[item.category]?.id === item.id}
              onToggle={handleToggleItem}
            />
          ))}
        </View>
      </Main.Scroll>

      <View className="outfit-panel">
        <View className="outfit-panel__card">
          <View className="outfit-panel__header">
            <View className="outfit-panel__info">
              <Text className="outfit-panel__title">当前搭配</Text>
              <Text className="outfit-panel__desc">
                已选 {outfitPieces.length} 件单品 • 「{OUTFIT_NAME}」
              </Text>
            </View>
            <View className="outfit-panel__save" onClick={handleSaveOutfit}>
              <Text className="outfit-panel__save-text">保存搭配</Text>
            </View>
          </View>
          <View className="outfit-panel__thumbs">
            <View className="outfit-panel__thumbs-inner">
              {outfitPieces.map((piece) => (
                <View key={piece.id} className="outfit-thumb">
                  <View className="outfit-thumb__box">
                    <View className="outfit-thumb__media">
                      <Image
                        className="outfit-thumb__image"
                        src={piece.image}
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
              <View className="outfit-thumb outfit-thumb--add" onClick={handleAddPiece}>
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
