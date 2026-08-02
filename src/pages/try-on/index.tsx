import { useCallback, useState } from "react";
import Taro from "@tarojs/taro";
import AppNavbar from "@/components/AppNavbar";
import PageLoading from "@/components/PageLoading";
import { useMainTabNavigation } from "@/hooks/useMainTabNavigation";
import { useTryOnPreview } from "@/hooks/useTryOnPreview";
import { useTryOnRecommend } from "@/hooks/useTryOnRecommend";
import { useTryOnWear } from "@/hooks/useTryOnWear";
import { useWeather } from "@/hooks/useWeather";
import type { Gender } from "@/data/profile";
import { applyGenderSetupWithToast } from "@/services/applyGenderSetup";
import Main from "@/layouts/Main";
import TryOnEmptyState from "./components/TryOnEmptyState";
import TryOnResult from "./components/TryOnResult";
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

  const {
    status: previewStatus,
    heroImageUrl,
    heroCoverFileId,
    previewErrorMessage,
    generatePreview,
    handleHeroImageError,
  } = useTryOnPreview({
    selectedPieces,
    outfitName: recommendation?.outfitName ?? "今日推荐",
    description: recommendation?.description ?? "",
    fromCache,
    savedReturn,
    recommendReady: recommendStatus === "success",
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

  const renderBody = () => {
    switch (recommendStatus) {
      case "loading":
      case "idle":
        return <PageLoading text="AI 正在推荐穿搭…" />;
      case "needsGender":
        return (
          <TryOnEmptyState
            variant="needsGender"
            genderSaving={genderSaving}
            onGenderSelect={handleGenderSelect}
          />
        );
      case "empty":
        return (
          <TryOnEmptyState variant="empty" onGoWardrobe={handleGoWardrobe} />
        );
      case "error":
        return (
          <TryOnEmptyState
            variant="error"
            errorMessage={errorMessage}
            onRetry={refreshRecommend}
          />
        );
      default:
        return (
          <TryOnResult
            recommendation={recommendation}
            selectedPieces={selectedPieces}
            isManualOutfit={isManualOutfit}
            heroImageUrl={heroImageUrl}
            heroCoverFileId={heroCoverFileId}
            previewStatus={previewStatus}
            previewErrorMessage={previewErrorMessage}
            onRetryPreview={generatePreview}
            onHeroImageError={handleHeroImageError}
            weatherStatus={weatherStatus}
            weatherViewModel={weatherViewModel}
            onWeatherClick={handleWeatherClick}
            saving={saving}
            onWearOutfit={handleWearOutfit}
            onRefreshRecommend={refreshRecommend}
          />
        );
    }
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
