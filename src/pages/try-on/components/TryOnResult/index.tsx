import { WeatherCardViewModel } from "@/types/weather";
import { WardrobeItem } from "@/types/wardrobe";
import { TryOnPreviewStatus, TryOnRecommendation } from "@/types/try-on";
import { View, Text } from "@tarojs/components";
import OutfitCard from "@/components/OutfitCard";
import OutfitHero from "@/components/OutfitHero";
import OutfitMeta from "@/components/OutfitMeta";
import OutfitPieceList from "@/components/OutfitPieceList";
import OutlineButton from "@/components/OutlineButton";



import type { WeatherLoadStatus } from "@/services/weather";
import WearCta from "../WearCta";
import "./index.scss";

export interface TryOnResultProps {
  recommendation: TryOnRecommendation | null;
  selectedPieces: WardrobeItem[];
  heroImageUrl?: string | null;
  heroCoverFileId?: string | null;
  previewStatus: TryOnPreviewStatus;
  previewErrorMessage: string | null;
  onRetryPreview: () => void;
  onHeroImageError: () => void;
  weatherStatus: WeatherLoadStatus;
  weatherViewModel: WeatherCardViewModel | null;
  onWeatherClick: () => void;
  saving: boolean;
  wearConfirmed: boolean;
  onWearOutfit: () => void;
}

function TryOnResult({
  recommendation,
  selectedPieces,
  heroImageUrl,
  heroCoverFileId,
  previewStatus,
  previewErrorMessage,
  onRetryPreview,
  onHeroImageError,
  weatherStatus,
  weatherViewModel,
  onWeatherClick,
  saving,
  wearConfirmed,
  onWearOutfit,
}: TryOnResultProps) {
  const styleTags = (recommendation?.tips ?? [])
    .map((tip) => tip.label)
    .filter(Boolean)
    .join(" / ");

  return (
    <>
      <OutfitCard
        hero={
          <OutfitHero
            heroImageUrl={heroImageUrl}
            heroCoverFileId={heroCoverFileId}
            previewStatus={previewStatus}
            previewErrorMessage={previewErrorMessage}
            onRetryPreview={onRetryPreview}
            onImageError={onHeroImageError}
            weatherStatus={weatherStatus}
            weatherViewModel={weatherViewModel}
            onWeatherClick={onWeatherClick}
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
        <WearCta
          confirmed={wearConfirmed}
          loading={saving}
          disabled={
            !wearConfirmed &&
            (previewStatus === "loading" || previewStatus === "error")
          }
          onWear={onWearOutfit}
        />
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
