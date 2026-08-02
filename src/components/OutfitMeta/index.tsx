import { View, Text, ScrollView } from "@tarojs/components";
import "./index.scss";

export interface OutfitMetaProps {
  title: string;
  styleTags?: string;
  subtitle?: string;
  suggestion?: string;
}

export default function OutfitMeta({
  title,
  styleTags,
  subtitle,
  suggestion,
}: OutfitMetaProps) {
  return (
    <View className="outfit-meta">
      <View className="outfit-meta__title-row">
        <Text className="outfit-meta__title">{title}</Text>
        {styleTags ? (
          <ScrollView
            className="outfit-meta__tags"
            scrollX
            showScrollbar={false}
            enhanced
          >
            <Text className="outfit-meta__tags-text">{styleTags}</Text>
          </ScrollView>
        ) : null}
      </View>
      {subtitle ? (
        <Text className="outfit-meta__subtitle">{subtitle}</Text>
      ) : null}
      {suggestion ? (
        <View className="outfit-meta__suggestion">
          <Text className="iconfont icon-stars outfit-meta__suggestion-icon" />
          <Text className="outfit-meta__suggestion-text">
            AI 搭配建议：{suggestion}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
