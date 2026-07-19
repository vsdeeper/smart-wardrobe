import { View, Text } from "@tarojs/components";

export interface OutfitMetaProps {
  title: string;
  styleTags: string;
  suggestion: string;
}

export default function OutfitMeta({
  title,
  styleTags,
  suggestion,
}: OutfitMetaProps) {
  return (
    <View className="outfit-meta">
      <View className="outfit-meta__title-row">
        <Text className="outfit-meta__title">{title}</Text>
        {styleTags ? (
          <View className="outfit-meta__tags">
            <Text className="outfit-meta__tags-text">{styleTags}</Text>
          </View>
        ) : null}
      </View>
      {suggestion ? (
        <View className="outfit-meta__suggestion">
          <Text className="outfit-meta__suggestion-icon">✦</Text>
          <Text className="outfit-meta__suggestion-text">
            AI 搭配建议：{suggestion}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
