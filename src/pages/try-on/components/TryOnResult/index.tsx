import { WeatherSnapshot } from "@/types/weather";
import { WardrobeItem } from "@/types/wardrobe";
import { TryOnPreviewStatus, TryOnRecommendation } from "@/types/try-on";
import { View, Text } from "@tarojs/components";
import { buildWeatherCardView } from "@/utils/weather";
import OutfitCard from "@/components/OutfitCard";
import OutfitHero from "@/components/OutfitHero";
import OutfitMeta from "@/components/OutfitMeta";
import OutfitPieceList from "@/components/OutfitPieceList";
import OutlineButton from "@/components/OutlineButton";
import SolidButton from "@/components/SolidButton";
import WearDateSelector from "../WearDateSelector";

import "./index.scss";

export interface TryOnResultProps {
  recommendation: TryOnRecommendation | null;
  selectedPieces: WardrobeItem[];
  plannedWearDateKey: string;
  onWearDateChange: (dateKey: string) => void;
  weatherSnapshot: WeatherSnapshot | null;
  onRefreshWeather?: () => void;
  heroImageUrl?: string | null;
  heroCoverFileId?: string | null;
  previewStatus: TryOnPreviewStatus;
  previewErrorMessage: string | null;
  onRetryPreview: () => void;
  onHeroImageError: () => void;
  saving: boolean;
  wearConfirmed: boolean;
  onWearOutfit: () => void;
}

function TryOnResult({
  recommendation,
  selectedPieces,
  plannedWearDateKey,
  onWearDateChange,
  weatherSnapshot,
  onRefreshWeather,
  heroImageUrl,
  heroCoverFileId,
  previewStatus,
  previewErrorMessage,
  onRetryPreview,
  onHeroImageError,
  saving,
  wearConfirmed,
  onWearOutfit,
}: TryOnResultProps) {
  const styleTags = (recommendation?.tips ?? [])
    .map((tip) => tip.label)
    .filter(Boolean)
    .join(" / ");

  const weatherViewModel = weatherSnapshot
    ? buildWeatherCardView(weatherSnapshot)
    : null;

  return (
    <>
      <View className="try-on-result__header">
        <WearDateSelector
          value={plannedWearDateKey}
          onChange={onWearDateChange}
          disabled={saving || previewStatus === "loading"}
        />
      </View>
      <OutfitCard
        hero={
          <OutfitHero
            heroImageUrl={heroImageUrl}
            heroCoverFileId={heroCoverFileId}
            previewStatus={previewStatus}
            previewErrorMessage={previewErrorMessage}
            onRetryPreview={onRetryPreview}
            onImageError={onHeroImageError}
            weatherViewModel={weatherViewModel}
            onWeatherClick={onRefreshWeather}
          />
        }
      >
        <OutfitMeta
          title={recommendation?.outfitName ?? ""}
          styleTags={styleTags}
          suggestion={recommendation?.description ?? ""}
        />
        <OutfitPieceList pieces={selectedPieces} />
      </OutfitCard>
      <View className="try-on-actions">
        <SolidButton
          block
          loading={saving}
          disabled={
            !wearConfirmed &&
            (previewStatus === "loading" || previewStatus === "error")
          }
          onClick={onWearOutfit}
        >
          {wearConfirmed ? "我要搭配" : "穿上这身"}
        </SolidButton>
        <OutlineButton
          block
          disabled={saving || previewStatus === "loading"}
          onClick={onRetryPreview}
        >
          重新试穿
        </OutlineButton>
        <Text className="try-on-actions__ai-hint">
          效果由 AI 生成，仅供参考
        </Text>
      </View>
    </>
  );
}

export default TryOnResult;
