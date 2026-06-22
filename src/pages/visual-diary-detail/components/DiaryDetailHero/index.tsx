import { View, Text } from "@tarojs/components";
import { Image } from "@nutui/nutui-react-taro";
import type { VisualDiaryEntry } from "@/data/tryOn";
import "./index.scss";

export interface DiaryDetailHeroProps {
  entry: VisualDiaryEntry;
}

export default function DiaryDetailHero({ entry }: DiaryDetailHeroProps) {
  const heroSrc = entry.coverUrl || entry.coverFileId;
  const matchScore = entry.matchScore ?? 90;

  return (
    <View className="diary-detail-hero">
      {heroSrc ? (
        <Image
          className="diary-detail-hero__image"
          src={heroSrc}
          mode="aspectFill"
        />
      ) : null}
      <View className="diary-detail-hero__gradient" aria-hidden />
      <View className="diary-detail-hero__badge">
        <Text className="diary-detail-hero__badge-icon">★</Text>
        <Text className="diary-detail-hero__badge-text">
          匹配度 {matchScore}%
        </Text>
      </View>
      <View className="diary-detail-hero__content">
        <Text className="diary-detail-hero__title">{entry.title}</Text>
        <Text className="diary-detail-hero__desc">{entry.description}</Text>
      </View>
    </View>
  );
}
