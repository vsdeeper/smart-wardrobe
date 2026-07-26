import { View, Text } from "@tarojs/components";
import AppNavbar from "@/components/AppNavbar";
import OutlineButton from "@/components/OutlineButton";
import PageLoading from "@/components/PageLoading";
import SolidButton from "@/components/SolidButton";
import WardrobeDetailHero from "@/components/WardrobeDetailHero";
import { useWardrobeEdit } from "@/hooks/useWardrobeEdit";
import Main from "@/layouts/Main";
import {
  WardrobeEditFormFields,
  WardrobeEditFormOverlays,
  WardrobeEditFormProvider,
} from "./components/WardrobeEditForm";
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
    isRecognitionMode,
  } = useWardrobeEdit();

  const ready = !loading && !!item;

  const main = (
    <Main
      showTabbar={false}
      header={
        <AppNavbar showBack title="编辑衣物" onBack={handleCancel} />
      }
      scrollClassName={ready ? "main-scroll--wardrobe-edit" : undefined}
    >
      <Main.Scroll>
        <View className="wardrobe-edit-page">
          {loading && <PageLoading />}

          {!loading && error && (
            <View className="wardrobe-edit-page__state">
              <Text className="wardrobe-edit-page__state-text">{error}</Text>
            </View>
          )}

          {ready && item && (
            <View className="wardrobe-edit-page__content">
              <WardrobeDetailHero item={item} />
              <WardrobeEditFormFields />
            </View>
          )}
        </View>
      </Main.Scroll>

      {ready ? <WardrobeEditFormOverlays /> : null}
      {ready ? (
        <View className="sw-action-bar">
          <OutlineButton block disabled={saving} onClick={handleCancel}>
            取消
          </OutlineButton>
          <SolidButton block loading={saving} onClick={handleSave}>
            保存
          </SolidButton>
        </View>
      ) : null}
    </Main>
  );

  if (!ready) return main;

  return (
    <WardrobeEditFormProvider
      name={name}
      typeName={typeName}
      tags={tags}
      outfitRecommendation={outfitRecommendation}
      clothingTypes={clothingTypes}
      hideOutfitRecommendation={isRecognitionMode}
      onNameChange={setName}
      onTypeNameChange={setTypeName}
      onTagsChange={setTags}
      onOutfitRecommendationChange={setOutfitRecommendation}
    >
      {main}
    </WardrobeEditFormProvider>
  );
}

export default WardrobeEditPage;
