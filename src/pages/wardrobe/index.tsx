import { useRef } from "react";
import { View, Text } from "@tarojs/components";
import { Add } from "@nutui/icons-react-taro";
import { ActionSheet, Loading, Tabs } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import GenderSetupDialog from "@/components/GenderSetupDialog";
import PageLoading from "@/components/PageLoading";
import Main from "@/layouts/Main";
import { WARDROBE_ITEM_ACTION_OPTIONS } from "@/data/wardrobe";
import { useGenderSetup } from "@/hooks/useGenderSetup";
import { useWardrobeList } from "@/hooks/useWardrobeList";
import { useWardrobeUpload } from "@/hooks/useWardrobeUpload";
import { useMainTabNavigation } from "@/hooks/useMainTabNavigation";
import PrivacyAuthorizeDialog from "./components/PrivacyAuthorizeDialog";
import WardrobeItemCard from "./components/WardrobeItemCard";
import WardrobeRefreshHint from "@/components/WardrobeRefreshHint";
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
    showRefreshHint,
    refreshHintTypeNames,
    refreshHintLoading,
    handleTypeChange,
    handleScrollToLower,
    handleRefreshHintClick,
    closeActionSheet,
    handleItemLongPress,
    handleItemClick,
    handleItemImageError,
    handleActionSelect,
  } = useWardrobeList({ uploadFlowRef });

  const {
    adding,
    privacyVisible,
    privacyContractName,
    handleAddItem,
    handlePrivacyAgreed,
    closePrivacyDialog,
  } = useWardrobeUpload({
    uploadFlowRef,
    ensureGenderSet,
  });

  return (
    <Main activeTab={mainTab} onTabChange={onTabChange} header={<AppNavbar />}>
      <Main.Scroll lowerThreshold={120} onScrollToLower={handleScrollToLower}>
        <View className="page-header">
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

        {showRefreshHint && !refreshHintLoading && (
          <WardrobeRefreshHint
            typeNames={refreshHintTypeNames}
            onClick={handleRefreshHintClick}
          />
        )}

        {initialLoading ? (
          <PageLoading />
        ) : items.length === 0 ? (
          <View className="wardrobe-empty">
            <Text className="wardrobe-empty__title">衣橱还是空的</Text>
            <Text className="wardrobe-empty__desc">
              点击右下角按钮上传衣物照片，AI 将自动识别并分类
            </Text>
          </View>
        ) : (
          <View className="wardrobe-grid">
            {items.map((item) => (
              <WardrobeItemCard
                key={item._id}
                item={item}
                onClick={handleItemClick}
                onLongPress={handleItemLongPress}
                onImageError={handleItemImageError}
              />
            ))}
          </View>
        )}

        {listLoading && items.length > 0 && (
          <PageLoading text="加载更多..." />
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
