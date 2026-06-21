import { View, Text } from "@tarojs/components";
import { Close } from "@nutui/icons-react-taro";
// import { Add } from "@nutui/icons-react-taro"; // 添加单品入口暂隐藏
import { Image, Loading, Tabs } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import { useMainTabNavigation } from "@/hooks/useMainTabNavigation";
import { useOutfitPage } from "@/hooks/useOutfitPage";
import Main from "@/layouts/Main";
import MatchItemCard from "./components/MatchItemCard";
import "./index.scss";

function OutfitPage() {
  const { activeTab, onTabChange } = useMainTabNavigation(2);
  const {
    typeNames,
    activeCategoryIndex,
    filteredItems,
    outfitPieces,
    outfitName,
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

  // const handleAddPiece = () => {
  //   Taro.showToast({ title: "从上方列表选择单品", icon: "none" });
  // };

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
                        <Close size={12} color="var(--sw-color-on-primary)" />
                      </View>
                    </View>
                  </View>
                ))}
                {/* 添加单品入口暂隐藏，仅从上方分类列表选品
                <View
                  className="outfit-thumb outfit-thumb--add"
                  onClick={handleAddPiece}
                >
                  <Add size={20} color="var(--nutui-gray-5)" />
                  <Text className="outfit-thumb__add-label">添加单品</Text>
                </View>
                */}
              </View>
            </View>
          </View>
        </View>
      )}
    </Main>
  );
}

export default OutfitPage;
