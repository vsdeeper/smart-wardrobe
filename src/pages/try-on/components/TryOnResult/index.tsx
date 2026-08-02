import { View, Text } from "@tarojs/components";
import OutfitCard from "@/components/OutfitCard";
import OutfitHero from "@/components/OutfitHero";
import OutfitMeta from "@/components/OutfitMeta";
import OutfitPieceList from "@/components/OutfitPieceList";
import OutlineButton from "@/components/OutlineButton";
import type { TryOnPreviewStatus, TryOnRecommendation } from "@/data/tryOn";
import type { WardrobeItem } from "@/data/wardrobe";
import type { WeatherCardViewModel } from "@/data/weather";
import type { WeatherLoadStatus } from "@/services/weather";
import WearCta from "../WearCta";
import "./index.scss";

export interface TryOnResultProps {
  recommendation: TryOnRecommendation | null;
  selectedPieces: WardrobeItem[];
  isManualOutfit: boolean;
  heroImageUrl?: string | null;
  heroCoverFileId?: string | null;
  previewStatus: TryOnPreviewStatus;
  previewErrorMessage: string | null;
  onRetryPreview: () => void;
  weatherStatus: WeatherLoadStatus;
  weatherViewModel: WeatherCardViewModel | null;
  onWeatherClick: () => void;
  saving: boolean;
  onWearOutfit: () => void;
  onRefreshRecommend: () => void;
}

function TryOnResult({
  recommendation,
  selectedPieces,
  isManualOutfit,
  heroImageUrl,
  heroCoverFileId,
  previewStatus,
  previewErrorMessage,
  onRetryPreview,
  weatherStatus,
  weatherViewModel,
  onWeatherClick,
  saving,
  onWearOutfit,
  onRefreshRecommend,
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
            weatherStatus={weatherStatus}
            weatherViewModel={weatherViewModel}
            onWeatherClick={onWeatherClick}
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
          disabled={previewStatus === "loading" || previewStatus === "error"}
          onWear={onWearOutfit}
        />
        {!isManualOutfit ? (
          <OutlineButton
            block
            disabled={saving || previewStatus === "loading"}
            onClick={onRefreshRecommend}
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
}

export default TryOnResult;
