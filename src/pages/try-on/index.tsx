import { Gender } from "@/types/profile";
import { useCallback, useState } from "react";
import Taro from "@tarojs/taro";
import AppNavbar from "@/components/AppNavbar";
import PageLoading from "@/components/PageLoading";
import { useMainTabNavigation } from "@/hooks/use-main-tab-navigation";
import { useTryOnPreview } from "@/hooks/use-try-on-preview";
import { useTryOnRecommend } from "@/hooks/use-try-on-recommend";
import { useTryOnWear } from "@/hooks/use-try-on-wear";
import { applyGenderSetupWithToast } from "@/services/apply-gender-setup";
import { setActiveWearDateKey } from "@/services/try-on-cache";
import Main from "@/layouts/Main";
import TryOnEmptyState from "./components/TryOnEmptyState";
import TryOnResult from "./components/TryOnResult";
import "./index.scss";

function TryOnPage() {
  const { activeTab, onTabChange } = useMainTabNavigation(1);
  const [genderSaving, setGenderSaving] = useState(false);

  const {
    status: recommendStatus,
    errorMessage,
    recommendation,
    selectedPieces,
    fromCache,
    savedReturn,
    isManualOutfit,
    retryRecommend,
    weatherSnapshot,
    plannedWearDateKey,
    setWearDateKey,
    startRecommend,
    refreshWeather,
  } = useTryOnRecommend();

  const {
    status: previewStatus,
    heroImageUrl,
    heroCoverFileId,
    previewErrorMessage,
    generatePreview,
    handleHeroImageError,
  } = useTryOnPreview({
    plannedWearDateKey,
    selectedPieces,
    fromCache,
    savedReturn,
    recommendReady: recommendStatus === "success",
    weatherSnapshot,
  });

  const { saving, wearConfirmed, handleWearOutfit } = useTryOnWear({
    plannedWearDateKey,
    recommendation,
    selectedPieces,
    heroCoverFileId,
    weatherSnapshot,
    isManualOutfit,
  });

  const handleWearCta = useCallback(() => {
    if (wearConfirmed) {
      Taro.redirectTo({ url: "/pages/outfit/index" });
      return;
    }
    void handleWearOutfit();
  }, [wearConfirmed, handleWearOutfit]);

  const handleGenderSelect = useCallback(
    async (gender: Gender) => {
      if (genderSaving) return;
      setGenderSaving(true);
      const saved = await applyGenderSetupWithToast(gender);
      setGenderSaving(false);
      if (saved) {
        retryRecommend();
      }
    },
    [genderSaving, retryRecommend],
  );

  const handleGoWardrobe = useCallback(() => {
    Taro.redirectTo({ url: "/pages/wardrobe/index" });
  }, []);

  const handleGoOutfit = useCallback(() => {
    setActiveWearDateKey(plannedWearDateKey);
    Taro.redirectTo({ url: "/pages/outfit/index" });
  }, [plannedWearDateKey]);

  const handleWearDateChange = useCallback(
    (dateKey: string) => {
      void setWearDateKey(dateKey);
    },
    [setWearDateKey],
  );

  const renderBody = () => {
    switch (recommendStatus) {
      case "loading":
        return (
          <PageLoading
            text={isManualOutfit ? "AI 正在评价搭配…" : "AI 正在推荐穿搭…"}
          />
        );
      case "ready":
        return (
          <TryOnEmptyState
            variant="ready"
            plannedWearDateKey={plannedWearDateKey}
            onWearDateChange={handleWearDateChange}
            onRecommend={startRecommend}
            onGoOutfit={handleGoOutfit}
          />
        );
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
            onRetry={retryRecommend}
          />
        );
      default:
        return (
          <TryOnResult
            recommendation={recommendation}
            selectedPieces={selectedPieces}
            plannedWearDateKey={plannedWearDateKey}
            onWearDateChange={handleWearDateChange}
            weatherSnapshot={weatherSnapshot}
            onRefreshWeather={() => void refreshWeather()}
            heroImageUrl={heroImageUrl}
            heroCoverFileId={heroCoverFileId}
            previewStatus={previewStatus}
            previewErrorMessage={previewErrorMessage}
            onRetryPreview={generatePreview}
            onHeroImageError={handleHeroImageError}
            saving={saving}
            wearConfirmed={wearConfirmed}
            onWearOutfit={handleWearCta}
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
