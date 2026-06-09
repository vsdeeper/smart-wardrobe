import { View, Text } from "@tarojs/components";
import "./index.scss";

export interface WardrobeStylingCtaProps {
  onStartStyling: () => void;
}

export default function WardrobeStylingCta({
  onStartStyling,
}: WardrobeStylingCtaProps) {
  return (
    <View className="wardrobe-card wardrobe-card--cta">
      <View className="wardrobe-cta">
        <View className="wardrobe-cta__pattern" aria-hidden>
          <Text className="iconfont icon-magic-wand wardrobe-cta__pattern-icon" />
        </View>
        <View className="wardrobe-cta__content">
          <Text className="wardrobe-cta__title">需要搭配建议吗？</Text>
          <Text className="wardrobe-cta__desc">
            AI 已根据您的收藏为您准备了全新搭配。
          </Text>
          <View className="wardrobe-cta__btn" onClick={onStartStyling}>
            <Text className="wardrobe-cta__btn-text">开始搭配</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
