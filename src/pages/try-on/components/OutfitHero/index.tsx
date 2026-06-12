import { View, Text } from "@tarojs/components";
import { Image, Loading } from "@nutui/nutui-react-taro";
import type { TryOnPreviewStatus } from "@/data/tryOn";
import { TRY_ON_HERO_IMAGE } from "@/data/mock/try-on";

export interface OutfitHeroProps {
  title: string;
  description: string;
  matchScore: number;
  heroImageUrl: string | null;
  previewStatus: TryOnPreviewStatus;
}

export default function OutfitHero({
  title,
  description,
  matchScore,
  heroImageUrl,
  previewStatus,
}: OutfitHeroProps) {
  const imageSrc = heroImageUrl || TRY_ON_HERO_IMAGE;
  const isLoading = previewStatus === "loading";

  return (
    <View className="outfit-hero">
      <Image
        className="outfit-hero__image"
        src={imageSrc}
        mode="aspectFill"
      />
      {isLoading && (
        <View className="outfit-hero__loading">
          <Loading type="circular" />
        </View>
      )}
      <View className="outfit-hero__gradient" aria-hidden />
      <View className="outfit-hero__badge">
        <Text className="outfit-hero__badge-icon">★</Text>
        <Text className="outfit-hero__badge-text">匹配度 {matchScore}%</Text>
      </View>
      <View className="outfit-hero__content">
        <Text className="outfit-hero__title">{title}</Text>
        <Text className="outfit-hero__desc">{description}</Text>
      </View>
    </View>
  );
}
