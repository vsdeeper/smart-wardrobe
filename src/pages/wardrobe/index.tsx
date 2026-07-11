import { useRef } from "react";
import { View, Text } from "@tarojs/components";
import { Add } from "@nutui/icons-react-taro";
import { ActionSheet, Loading, Tabs } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import GenderSetupDialog from "@/components/GenderSetupDialog";
import Main from "@/layouts/Main";
import { WARDROBE_ITEM_ACTION_OPTIONS } from "@/data/wardrobe";
import { useGenderSetup } from "@/hooks/useGenderSetup";
import { useWardrobeList } from "@/hooks/useWardrobeList";
import { useWardrobeUpload } from "@/hooks/useWardrobeUpload";
import { getCardLayout } from "@/utils/wardrobeLayout";
import { useMainTabNavigation } from "@/hooks/useMainTabNavigation";
import PrivacyAuthorizeDialog from "./components/PrivacyAuthorizeDialog";
import WardrobeItemCard from "./components/WardrobeItemCard";
import WardrobeStylingCta from "./components/WardrobeStylingCta";
import "./index.scss";

function WardrobePage() {
  const uploadFlowRef = useRef(false);

  const { activeTab: mainTab, onTabChange } = useMainTabNavigation(0);

  const {
    dialogVisible,
    saving: genderSaving,
    ensureGenderSet,
    handleSelect: handleGenderSelect,
    handleCancel: handleGenderCancel,
  } = useGenderSetup();

  const {
    items,
    activeTab,
    tabTitles,
    initialLoading,
    listLoading,
    actionSheetVisible,
    handleTypeChange,
    handleScrollToLower,
    closeActionSheet,
    handleItemLongPress,
    handleItemClick,
    handleActionSelect,
  } = useWardrobeList({ uploadFlowRef });

  const {
    adding,
    privacyVisible,
    privacyContractName,
    handleAddItem,
    handlePrivacyAgreed,
    closePrivacyDialog,
    handleAIStyling,
  } = useWardrobeUpload({
    uploadFlowRef,
    ensureGenderSet,
  });

  return (
    <Main activeTab={mainTab} onTabChange={onTabChange} header={<AppNavbar />}>
      <Main.Scroll lowerThreshold={120} onScrollToLower={handleScrollToLower}>
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
                onClick={handleItemClick}
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
        className={["sw-fab wardrobe-fab", adding && "sw-fab--loading"]
          .filter(Boolean)
          .join(" ")}
        onClick={handleAddItem}
      >
        {adding ? (
          <Loading
            type="circular"
            color="var(--sw-color-on-primary)"
            className="sw-btn-loading"
          />
        ) : (
          <Add
            className="sw-fab__icon"
            color="var(--sw-color-on-primary)"
            size={30}
          />
        )}
      </View>

      <ActionSheet
        className="wardrobe-actionsheet"
        visible={actionSheetVisible}
        options={WARDROBE_ITEM_ACTION_OPTIONS}
        cancelText="取消"
        onSelect={handleActionSelect}
        onCancel={closeActionSheet}
        onClose={closeActionSheet}
      />

      <PrivacyAuthorizeDialog
        visible={privacyVisible}
        contractName={privacyContractName}
        onClose={closePrivacyDialog}
        onAgreed={handlePrivacyAgreed}
      />

      <GenderSetupDialog
        visible={dialogVisible}
        loading={genderSaving}
        onSelect={handleGenderSelect}
        onCancel={handleGenderCancel}
      />
    </Main>
  );
}

export default WardrobePage;
