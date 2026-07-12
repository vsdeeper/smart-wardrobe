import { View, Text, ScrollView } from "@tarojs/components";
import { Tag, Image } from "@nutui/nutui-react-taro";
import type { WardrobeItem } from "@/data/wardrobe";
import "./index.scss";

export interface WardrobeItemCardProps {
  item: WardrobeItem;
  onClick?: (item: WardrobeItem) => void;
  onLongPress?: (item: WardrobeItem) => void;
}

export default function WardrobeItemCard({
  item,
  onClick,
  onLongPress,
}: WardrobeItemCardProps) {
  return (
    <View
      className="wardrobe-card"
      onClick={() => onClick?.(item)}
      onLongPress={() => onLongPress?.(item)}
    >
      <View className="wardrobe-card__inner">
        <View className="wardrobe-card__image-wrap">
          <Image
            className="wardrobe-card__image"
            src={item.imageUrl || item.imageFileId}
            mode="aspectFill"
            radius="0"
          />
        </View>
        <View className="wardrobe-card__body">
          <Text className="wardrobe-card__category">{item.typeName}</Text>
          <Text className="wardrobe-card__name">{item.name}</Text>
          {item.tags && item.tags.length > 0 && (
            <ScrollView
              className="wardrobe-card__tags-scroll"
              scrollX
              showScrollbar={false}
              enhanced
            >
              <View className="wardrobe-card__tags">
                {item.tags.map((tag) => (
                  <Tag
                    key={tag}
                    round
                    className="sw-tag"
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
    </View>
  );
}
