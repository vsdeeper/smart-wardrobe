import { View, Text } from "@tarojs/components";
import { Image, Loading } from "@nutui/nutui-react-taro";
import type { TryOnPreviewStatus } from "@/data/tryOn";

export interface OutfitHeroProps {
  title: string;
  description: string;
  matchScore: number;
  heroImageUrl: string | null;
  heroCoverFileId: string | null;
  previewStatus: TryOnPreviewStatus;
  previewErrorMessage?: string | null;
}

export default function OutfitHero({
  title,
  description,
  matchScore,
  heroImageUrl,
  heroCoverFileId,
  previewStatus,
  previewErrorMessage,
}: OutfitHeroProps) {
  const isLoading = previewStatus === "loading";
  const isError = previewStatus === "error";
  const heroSrc = heroImageUrl || heroCoverFileId;

  return (
    <View className="outfit-hero">
      {heroSrc ? (
        <Image
          className="outfit-hero__image"
          src={heroSrc}
          mode="aspectFill"
        />
      ) : null}
      {isLoading && (
        <View className="outfit-hero__loading">
          <Loading type="circular" />
        </View>
      )}
      {isError && (
        <View className="outfit-hero__error">
          <Text className="outfit-hero__error-title">试穿图生成失败</Text>
          <Text className="outfit-hero__error-desc">
            {previewErrorMessage || "请稍后重试"}
          </Text>
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
