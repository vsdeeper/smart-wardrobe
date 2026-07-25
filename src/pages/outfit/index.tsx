import { useEffect, useRef, useState } from "react";
import { View, Text } from "@tarojs/components";
import { Loading, Tabs } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import { useMainTabNavigation } from "@/hooks/useMainTabNavigation";
import { useOutfitPage } from "@/hooks/useOutfitPage";
import Main from "@/layouts/Main";
import MatchItemCard from "./components/MatchItemCard";
import OutfitPanel from "./components/OutfitPanel";
import "./index.scss";

function OutfitPage() {
  const { activeTab, onTabChange } = useMainTabNavigation(2);
  const {
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
  } = useOutfitPage();

  const [collapsed, setCollapsed] = useState(true);
  const prevPieceCountRef = useRef(0);

  useEffect(() => {
    const count = outfitPieces.length;
    if (count === 0) {
      setCollapsed(true);
    } else if (prevPieceCountRef.current === 0) {
      setCollapsed(false);
    }
    prevPieceCountRef.current = count;
  }, [outfitPieces.length]);

  const scrollClassName = [
    "main-scroll--outfit",
    collapsed && "main-scroll--outfit--collapsed",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Main
      activeTab={activeTab}
      onTabChange={onTabChange}
      scrollClassName={scrollClassName}
      header={<AppNavbar />}
    >
      <Main.Scroll>
        {initialLoading ? (
          <View className="outfit-loading">
            <Loading type="circular" />
          </View>
        ) : wardrobeEmpty ? (
          <View className="outfit-empty">
            <Text className="outfit-empty__title">衣橱还是空的</Text>
            <Text className="outfit-empty__desc">
              上传衣物后，即可在此手动搭配单品
            </Text>
            <View className="outfit-empty__cta" onClick={handleGoWardrobe}>
              <Text className="outfit-empty__cta-text">去上传衣物</Text>
            </View>
          </View>
        ) : (
          <>
            <View className="outfit-filter">
              <Tabs
                value={activeCategoryIndex}
                activeType="button"
                className="type-tabs"
                onChange={(v) => handleCategoryChange(v as number)}
              >
                {typeNames.map((cat, idx) => (
                  <Tabs.TabPane key={cat} title={cat} value={idx} />
                ))}
              </Tabs>
            </View>

            <View className="match-grid">
              {listLoading ? (
                <View className="outfit-loading outfit-loading--inline">
                  <Loading type="circular" />
                </View>
              ) : filteredItems.length === 0 ? (
                <View className="outfit-empty-hint">
                  <Text>该分类暂无单品，请切换其他分类</Text>
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

      {!wardrobeEmpty && (
        <OutfitPanel
          pieces={outfitPieces}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
          onSave={handleSaveOutfit}
          onRemovePiece={handleRemovePiece}
        />
      )}
    </Main>
  );
}

export default OutfitPage;
