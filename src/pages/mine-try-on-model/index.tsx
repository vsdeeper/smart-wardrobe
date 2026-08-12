import { View, Text } from "@tarojs/components";
import { ImagePreview } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import OutlineButton from "@/components/OutlineButton";
import OverlayLoading from "@/components/OverlayLoading";
import PageLoading from "@/components/PageLoading";
import SolidButton from "@/components/SolidButton";
import { useMineTryOnModel } from "@/hooks/use-mine-try-on-model";
import Main from "@/layouts/Main";
import ModelCard from "./components/ModelCard";
import "./index.scss";

function MineTryOnModelPage() {
  const {
    loading,
    updating,
    generating,
    genderReady,
    galleryItems,
    urlReady,
    selectedKey,
    previewVisible,
    previewIndex,
    previewImages,
    creditCost,
    customCount,
    customMax,
    handleSelect,
    handleEnable,
    handlePreview,
    handleClosePreview,
    handleGenerate,
    handleDeleteCustom,
    handleOpenGenderEdit,
    isItemActive,
  } = useMineTryOnModel();

  const busy = updating || generating;

  return (
    <Main
      showTabbar={false}
      header={<AppNavbar showBack title="试穿模特" />}
    >
      <Main.Scroll>
        <View className="mine-try-on-model">
          {!genderReady && !loading ? (
            <View className="mine-try-on-model__empty">
              <Text className="mine-try-on-model__empty-title">
                请先设置性别
              </Text>
              <Text className="mine-try-on-model__empty-desc">
                选择后将用于筛选预设模特与生成本人模特
              </Text>
              <View
                className="mine-try-on-model__empty-cta"
                onClick={handleOpenGenderEdit}
              >
                <Text className="mine-try-on-model__empty-cta-text">
                  去设置性别
                </Text>
              </View>
            </View>
          ) : loading || !urlReady ? (
            <PageLoading />
          ) : (
            <>
              <Text className="mine-try-on-model__hint">
                预设与本人模特只能启用一个；生成本人模特消耗 {creditCost}{" "}
                积分/次（已保存 {customCount}/{customMax} 张）
              </Text>

              <View className="mine-try-on-model__section">
                <Text className="mine-try-on-model__section-title">预设</Text>
                <View className="mine-try-on-model__grid">
                  {galleryItems
                    .filter((item) => item.source === "preset")
                    .map((item) => (
                      <ModelCard
                        key={item.key}
                        item={item}
                        selected={selectedKey === item.key}
                        active={isItemActive(item)}
                        onSelect={handleSelect}
                      />
                    ))}
                </View>
              </View>

              <View className="mine-try-on-model__section">
                <Text className="mine-try-on-model__section-title">
                  本人模特
                </Text>
                {galleryItems.filter((item) => item.source === "custom")
                  .length === 0 ? (
                  <Text className="mine-try-on-model__custom-empty">
                    上传全身照生成与预设同款着装的本人模特
                  </Text>
                ) : (
                  <View className="mine-try-on-model__grid">
                    {galleryItems
                      .filter((item) => item.source === "custom")
                      .map((item) => (
                        <ModelCard
                          key={item.key}
                          item={item}
                          selected={selectedKey === item.key}
                          active={isItemActive(item)}
                          onSelect={handleSelect}
                          onDelete={handleDeleteCustom}
                        />
                      ))}
                  </View>
                )}
              </View>

              <View className="mine-try-on-model__generate">
                <OutlineButton
                  block
                  disabled={busy || customCount >= customMax}
                  loading={generating}
                  onClick={handleGenerate}
                >
                  上传全身照生成（{creditCost} 积分）
                </OutlineButton>
              </View>
            </>
          )}
        </View>
      </Main.Scroll>

      {genderReady && !loading && urlReady ? (
        <View className="mine-try-on-model__footer">
          <OutlineButton disabled={busy} onClick={handlePreview}>
            预览
          </OutlineButton>
          <SolidButton
            block
            disabled={busy || !selectedKey}
            loading={updating}
            onClick={handleEnable}
          >
            启用此模特
          </SolidButton>
        </View>
      ) : null}

      {generating ? <OverlayLoading text="生成中..." /> : null}

      <ImagePreview
        key={`preview-${previewIndex}`}
        visible={previewVisible}
        images={previewImages}
        defaultValue={previewIndex}
        closeIcon
        onClose={handleClosePreview}
      />
    </Main>
  );
}

export default MineTryOnModelPage;
