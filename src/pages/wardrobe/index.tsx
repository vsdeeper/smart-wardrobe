import { useRef, useState } from "react";
import { View, Text } from "@tarojs/components";
import { Add } from "@nutui/icons-react-taro";
import { ActionSheet, Loading, Tabs } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import Main from "@/layouts/Main";
import type { AiStatus } from "@/data/wardrobe";
import { WARDROBE_ITEM_ACTION_OPTIONS } from "@/data/wardrobe";
import { useWardrobeList } from "@/hooks/useWardrobeList";
import { useWardrobeUpload } from "@/hooks/useWardrobeUpload";
import { getCardLayout } from "@/utils/wardrobeLayout";
import { useMainTabNavigation } from "@/hooks/useMainTabNavigation";
import AiStatusBanner from "./components/AiStatusBanner";
import WardrobeItemCard from "./components/WardrobeItemCard";
import WardrobeStylingCta from "./components/WardrobeStylingCta";
import "./index.scss";

function WardrobePage() {
  const uploadFlowRef = useRef(false);
  const [aiStatus, setAiStatus] = useState<AiStatus>({
    phase: "idle",
    progress: 0,
    totalCount: 0,
  });

  const { activeTab: mainTab, onTabChange } = useMainTabNavigation(0);

  const {
    items,
    setItems,
    activeTab,
    activeTypeId,
    tabTitles,
    initialLoading,
    listLoading,
    actionSheetVisible,
    loadTypes,
    handleTypeChange,
    handleScrollToLower,
    closeActionSheet,
    handleItemLongPress,
    handleActionSelect,
  } = useWardrobeList({ uploadFlowRef, setAiStatus });

  const { adding, handleAddItem, handleAIStyling } = useWardrobeUpload({
    activeTypeId,
    setItems,
    loadTypes,
    setAiStatus,
    uploadFlowRef,
  });

  return (
    <Main activeTab={mainTab} onTabChange={onTabChange} header={<AppNavbar />}>
      <Main.Scroll lowerThreshold={120} onScrollToLower={handleScrollToLower}>
        <AiStatusBanner aiStatus={aiStatus} />

        <View className="page-header">
          <Text className="page-header__title">个人衣橱</Text>
          <Tabs
            value={activeTab}
            activeType="button"
            className="type-tabs"
            onChange={handleTypeChange}
          >
            {tabTitles.map((title, idx) => (
              <Tabs.TabPane key={title} title={title} value={idx} />
            ))}
          </Tabs>
        </View>

        {initialLoading ? (
          <View className="wardrobe-loading">
            <Loading type="circular" />
            <Text className="wardrobe-loading__text">加载中...</Text>
          </View>
        ) : items.length === 0 ? (
          <View className="wardrobe-empty">
            <Text className="wardrobe-empty__title">衣橱还是空的</Text>
            <Text className="wardrobe-empty__desc">
              点击右下角按钮上传衣物照片，AI 将自动识别并分类
            </Text>
          </View>
        ) : (
          <View className="wardrobe-grid">
            {items.map((item, index) => (
              <WardrobeItemCard
                key={item._id}
                item={item}
                layout={getCardLayout(index, items.length)}
                onLongPress={handleItemLongPress}
              />
            ))}
            <WardrobeStylingCta onStartStyling={handleAIStyling} />
          </View>
        )}

        {listLoading && items.length > 0 && (
          <View className="wardrobe-load-more">
            <Loading type="circular" />
            <Text className="wardrobe-load-more__text">加载更多...</Text>
          </View>
        )}
      </Main.Scroll>

      <View
        className={["wardrobe-fab", adding && "wardrobe-fab--loading"]
          .filter(Boolean)
          .join(" ")}
        onClick={handleAddItem}
      >
        {adding ? (
          <Loading
            type="circular"
            color="var(--sw-color-on-primary)"
            className="wardrobe-fab__loading"
          />
        ) : (
          <Add
            className="wardrobe-fab__icon"
            color="var(--sw-color-on-primary)"
            size={30}
          />
        )}
      </View>

      <ActionSheet
        visible={actionSheetVisible}
        options={WARDROBE_ITEM_ACTION_OPTIONS}
        cancelText="取消"
        onSelect={handleActionSelect}
        onCancel={closeActionSheet}
        onClose={closeActionSheet}
      />
    </Main>
  );
}

export default WardrobePage;
