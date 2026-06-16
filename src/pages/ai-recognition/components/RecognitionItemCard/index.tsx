import { View, Text, ScrollView } from "@tarojs/components";
import { Tag, Image } from "@nutui/nutui-react-taro";
import type { RecognizedPreviewItem } from "@/data/wardrobe";
import "./index.scss";

export interface RecognitionItemCardProps {
  item: RecognizedPreviewItem;
}

export default function RecognitionItemCard({ item }: RecognitionItemCardProps) {
  return (
    <View className="recognition-card">
      <View className="recognition-card__image-wrap">
        <Image
          className="recognition-card__image"
          src={item.imageUrl || item.imageFileId}
          mode="aspectFill"
          radius="0"
        />
      </View>
      <View className="recognition-card__body">
        <Text className="recognition-card__category">{item.typeName}</Text>
        <Text className="recognition-card__name">{item.name}</Text>
        {item.tags.length > 0 && (
          <ScrollView
            className="recognition-card__tags-scroll"
            scrollX
            showScrollbar={false}
            enhanced
          >
            <View className="recognition-card__tags">
              {item.tags.map((tag) => (
                <Tag
                  key={tag}
                  round
                  className="recognition-card__tag"
                  background="var(--sw-color-tag-bg)"
                  color="var(--sw-color-tag-text)"
                >
                  {tag}
                </Tag>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
