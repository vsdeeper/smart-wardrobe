import { useCallback, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import AppNavbar from "@/components/AppNavbar";
import GenderSetupChoices from "@/components/GenderSetupChoices";
import OutfitCard from "@/components/OutfitCard";
import OutfitHero from "@/components/OutfitHero";
import OutfitMeta from "@/components/OutfitMeta";
import OutfitPieceList from "@/components/OutfitPieceList";
import OutlineButton from "@/components/OutlineButton";
import PageLoading from "@/components/PageLoading";
import { useMainTabNavigation } from "@/hooks/useMainTabNavigation";
import { useTryOnPreview } from "@/hooks/useTryOnPreview";
import { useTryOnRecommend } from "@/hooks/useTryOnRecommend";
import { useTryOnWear } from "@/hooks/useTryOnWear";
import { useWeather } from "@/hooks/useWeather";
import type { Gender } from "@/data/profile";
import { applyGenderSetupWithToast } from "@/services/applyGenderSetup";
import Main from "@/layouts/Main";
import WearCta from "./components/WearCta";
import "./index.scss";

function TryOnPage() {
  const { activeTab, onTabChange } = useMainTabNavigation(1);
  const {
    viewModel: weatherViewModel,
    status: weatherStatus,
    handleCardClick: handleWeatherClick,
  } = useWeather();
  const [genderSaving, setGenderSaving] = useState(false);

  const {
    status: recommendStatus,
    errorMessage,
    recommendation,
    selectedPieces,
    fromCache,
    savedReturn,
    isManualOutfit,
    refreshRecommend,
    weatherSnapshot,
  } = useTryOnRecommend();

  const recommendReady = recommendStatus === "success";

  const {
    status: previewStatus,
    heroImageUrl,
    heroCoverFileId,
    previewErrorMessage,
    generatePreview,
  } = useTryOnPreview({
    selectedPieces,
    outfitName: recommendation?.outfitName ?? "今日推荐",
    description: recommendation?.description ?? "",
    fromCache,
    savedReturn,
    recommendReady,
    weatherSnapshot,
  });

  const { saving, handleWearOutfit } = useTryOnWear({
    recommendation,
    selectedPieces,
    heroCoverFileId,
    weatherSnapshot,
  });

  const handleGenderSelect = useCallback(
    async (gender: Gender) => {
      if (genderSaving) return;
      setGenderSaving(true);
      const saved = await applyGenderSetupWithToast(gender);
      setGenderSaving(false);
      if (saved) {
        refreshRecommend();
      }
    },
    [genderSaving, refreshRecommend],
  );

  const handleGoWardrobe = useCallback(() => {
    Taro.redirectTo({ url: "/pages/wardrobe/index" });
  }, []);

  const styleTags = (recommendation?.tips ?? [])
    .map((tip) => tip.label)
    .filter(Boolean)
    .join(" / ");

  const renderBody = () => {
    if (recommendStatus === "loading" || recommendStatus === "idle") {
      return <PageLoading text="AI 正在推荐穿搭…" />;
    }

    if (recommendStatus === "needsGender") {
      return (
        <View className="try-on-empty try-on-empty--gender">
          <Text className="try-on-empty__title">请先选择性别</Text>
          <Text className="try-on-empty__desc">
            选择后将用于 AI 穿搭推荐与虚拟试穿，您可在个人资料中修改身高体重。
          </Text>
          <GenderSetupChoices
            layout="inline"
            loading={genderSaving}
            onSelect={handleGenderSelect}
          />
        </View>
      );
    }

    if (recommendStatus === "empty") {
      return (
        <View className="try-on-empty">
          <Text className="try-on-empty__title">衣橱还是空的</Text>
          <Text className="try-on-empty__desc">
            上传衣物后，AI 将根据天气与场景为您推荐穿搭
          </Text>
          <View className="try-on-empty__cta" onClick={handleGoWardrobe}>
            <Text className="try-on-empty__cta-text">去上传衣物</Text>
          </View>
        </View>
      );
    }

    if (recommendStatus === "error") {
      return (
        <View className="try-on-empty">
          <Text className="try-on-empty__title">推荐失败</Text>
          <Text className="try-on-empty__desc">{errorMessage}</Text>
          <View className="try-on-empty__cta" onClick={refreshRecommend}>
            <Text className="try-on-empty__cta-text">重试</Text>
          </View>
        </View>
      );
    }

    return (
      <>
        <OutfitCard
          hero={
            <OutfitHero
              heroImageUrl={heroImageUrl}
              heroCoverFileId={heroCoverFileId}
              previewStatus={previewStatus}
              previewErrorMessage={previewErrorMessage}
              onRetryPreview={generatePreview}
              weatherStatus={weatherStatus}
              weatherViewModel={weatherViewModel}
              onWeatherClick={handleWeatherClick}
            />
          }
        >
          <OutfitMeta
            title={recommendation?.outfitName ?? "今日推荐"}
            styleTags={styleTags}
            suggestion={recommendation?.description ?? ""}
          />
          <OutfitPieceList pieces={selectedPieces} />
        </OutfitCard>
        <View className="try-on-actions">
          <WearCta
            loading={saving}
            disabled={
              previewStatus === "loading" || previewStatus === "error"
            }
            onWear={handleWearOutfit}
          />
          {!isManualOutfit ? (
            <OutlineButton
              block
              disabled={saving || previewStatus === "loading"}
              onClick={refreshRecommend}
            >
              换一套推荐
            </OutlineButton>
          ) : null}
          <Text className="try-on-actions__ai-hint">
            效果由 AI 生成，仅供参考
          </Text>
        </View>
      </>
    );
  };

  return (
    <Main
      activeTab={activeTab}
      onTabChange={onTabChange}
      scrollClassName="main-scroll--try-on"
      header={<AppNavbar />}
    >
      <Main.Scroll>{renderBody()}</Main.Scroll>
    </Main>
  );
}

export default TryOnPage;
