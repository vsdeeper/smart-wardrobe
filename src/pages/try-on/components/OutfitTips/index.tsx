import { View, Text } from "@tarojs/components";
import type { TryOnTip } from "@/data/tryOn";

export interface OutfitTipsProps {
  tips: TryOnTip[];
}

export default function OutfitTips({ tips }: OutfitTipsProps) {
  if (tips.length === 0) return null;

  return (
    <View className="outfit-tips">
      <Text className="outfit-tips__title">搭配小贴士</Text>
      <View className="outfit-tips__tags">
        {tips.map((tip) => (
          <View key={tip.id} className="outfit-tips__tag">
            <Text className="outfit-tips__tag-icon">{tip.icon}</Text>
            <Text className="outfit-tips__tag-text">{tip.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
