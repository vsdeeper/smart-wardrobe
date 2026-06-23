import { useCallback, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Loading } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import GenderSetupChoices from "@/components/GenderSetupChoices";
import { useMainTabNavigation } from "@/hooks/useMainTabNavigation";
import { useTryOnPreview } from "@/hooks/useTryOnPreview";
import { useTryOnRecommend } from "@/hooks/useTryOnRecommend";
import { useTryOnWear } from "@/hooks/useTryOnWear";
import { useWeather } from "@/hooks/useWeather";
import type { Gender } from "@/data/profile";
import { applyGenderSetupWithToast } from "@/services/applyGenderSetup";
import Main from "@/layouts/Main";
import { setTryOnDraft } from "@/services/tryOnDraft";
import { getPieceIds } from "@/utils/outfitSelection";
import OutfitHero from "./components/OutfitHero";
import OutfitPieceList from "./components/OutfitPieceList";
import OutfitTips from "./components/OutfitTips";
import WeatherCard from "./components/WeatherCard";
import WearCta from "./components/WearCta";
import "./index.scss";

function TryOnPage() {
  const { activeTab, onTabChange } = useMainTabNavigation(1);
  const { viewModel, status, isStale, handleCardClick } = useWeather();
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
  });

  const { saving, handleWearOutfit } = useTryOnWear({
    recommendation,
    selectedPieces,
    heroImageUrl,
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

  const handleEditOutfit = () => {
    if (selectedPieces.length === 0) {
      Taro.showToast({ title: "暂无搭配单品", icon: "none" });
      return;
    }
    setTryOnDraft({
      mode: "edit",
      outfitName: recommendation?.outfitName,
      description: recommendation?.description,
      matchScore: recommendation?.matchScore,
      tips: recommendation?.tips,
      selectedPieces,
      baselinePieceIds: getPieceIds(selectedPieces),
    });
    Taro.redirectTo({ url: "/pages/outfit/index" });
  };

  const renderBody = () => {
    if (recommendStatus === "loading" || recommendStatus === "idle") {
      return (
        <View className="try-on-loading">
          <Loading type="circular" />
          <Text className="try-on-loading__text">AI 正在推荐穿搭…</Text>
        </View>
      );
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
        <OutfitHero
          title={recommendation?.outfitName ?? "今日推荐"}
          description={recommendation?.description ?? ""}
          matchScore={recommendation?.matchScore ?? 90}
          heroImageUrl={heroImageUrl}
          heroCoverFileId={heroCoverFileId}
          previewStatus={previewStatus}
          previewErrorMessage={previewErrorMessage}
          onRetryPreview={generatePreview}
        />
        <OutfitPieceList pieces={selectedPieces} onEditOutfit={handleEditOutfit} />
        <OutfitTips tips={recommendation?.tips ?? []} />
        <View className="try-on-actions">
          {!isManualOutfit ? (
            <View
              className={[
                "sw-btn sw-btn--block sw-btn--secondary",
                (saving || previewStatus === "loading") && "sw-btn--disabled",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={
                saving || previewStatus === "loading"
                  ? undefined
                  : refreshRecommend
              }
            >
              <Text className="sw-btn__text">换一套</Text>
            </View>
          ) : null}
          <WearCta
            disabled={
              saving ||
              previewStatus === "loading" ||
              previewStatus === "error"
            }
            onWear={handleWearOutfit}
          />
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
      <Main.Scroll>
        <WeatherCard
          status={status}
          viewModel={viewModel}
          isStale={isStale}
          onClick={handleCardClick}
        />
        {renderBody()}
      </Main.Scroll>
    </Main>
  );
}

export default TryOnPage;
