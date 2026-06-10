import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Loading, NavBar } from "@nutui/nutui-react-taro";
import WardrobeDetailHero from "@/components/WardrobeDetailHero";
import { useWardrobeEdit } from "@/hooks/useWardrobeEdit";
import WardrobeEditForm from "./components/WardrobeEditForm";
import "./index.scss";

function WardrobeEditPage() {
  const {
    item,
    clothingTypes,
    name,
    typeName,
    tags,
    outfitRecommendation,
    loading,
    saving,
    error,
    setName,
    setTypeName,
    setTags,
    setOutfitRecommendation,
    handleCancel,
    handleSave,
  } = useWardrobeEdit();

  const { statusBarHeight, safeArea } = Taro.getWindowInfo();
  const safeAreaBottom = safeArea
    ? Taro.getWindowInfo().screenHeight - safeArea.bottom
    : 0;

  return (
    <View
      className="wardrobe-edit-page"
      style={{
        ["--sw-status-bar-height" as string]: `${statusBarHeight ?? 0}px`,
        ["--sw-safe-area-bottom" as string]: `${safeAreaBottom}px`,
      }}
    >
      <NavBar
        safeAreaInsetTop
        className="wardrobe-edit-page__navbar"
        back={<Text className="wardrobe-edit-page__back">返回</Text>}
        onBackClick={handleCancel}
      >
        <Text className="wardrobe-edit-page__title">编辑衣物</Text>
      </NavBar>

      <ScrollView
        className="wardrobe-edit-page__scroll"
        scrollY
        enhanced
        showScrollbar={false}
      >
        {loading && (
          <View className="wardrobe-edit-page__state">
            <Loading type="circular" />
          </View>
        )}

        {!loading && error && (
          <View className="wardrobe-edit-page__state">
            <Text className="wardrobe-edit-page__state-text">{error}</Text>
          </View>
        )}

        {!loading && item && (
          <View className="wardrobe-edit-page__content">
            <WardrobeDetailHero item={item} />
            <WardrobeEditForm
              name={name}
              typeName={typeName}
              tags={tags}
              outfitRecommendation={outfitRecommendation}
              clothingTypes={clothingTypes}
              onNameChange={setName}
              onTypeNameChange={setTypeName}
              onTagsChange={setTags}
              onOutfitRecommendationChange={setOutfitRecommendation}
            />
          </View>
        )}
      </ScrollView>

      {!loading && item && (
        <View className="wardrobe-edit-actions">
          <View
            className={[
              "wardrobe-edit-actions__btn",
              "wardrobe-edit-actions__btn--secondary",
              saving && "wardrobe-edit-actions__btn--disabled",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={handleCancel}
          >
            <Text className="wardrobe-edit-actions__btn-text">取消</Text>
          </View>
          <View
            className={[
              "wardrobe-edit-actions__btn",
              "wardrobe-edit-actions__btn--primary",
              saving && "wardrobe-edit-actions__btn--disabled",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={handleSave}
          >
            {saving ? (
              <Loading
                type="circular"
                color="var(--sw-color-on-primary)"
                className="wardrobe-edit-actions__loading"
              />
            ) : (
              <Text className="wardrobe-edit-actions__btn-text wardrobe-edit-actions__btn-text--primary">
                保存
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default WardrobeEditPage;
