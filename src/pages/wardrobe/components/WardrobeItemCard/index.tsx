import { View, Text, ScrollView } from "@tarojs/components";
import { Tag, Image } from "@nutui/nutui-react-taro";
import type { WardrobeItem } from "@/data/wardrobe";
import "./index.scss";

export interface WardrobeItemCardProps {
  item: WardrobeItem;
  layout?: "large" | "wide";
  onLongPress?: (item: WardrobeItem) => void;
}

export default function WardrobeItemCard({
  item,
  layout,
  onLongPress,
}: WardrobeItemCardProps) {
  const isLarge = layout === "large";
  const isWide = layout === "wide";

  return (
    <View
      className={[
        "wardrobe-card",
        isLarge && "wardrobe-card--large",
        isWide && "wardrobe-card--wide",
      ]
        .filter(Boolean)
        .join(" ")}
      onLongPress={() => onLongPress?.(item)}
    >
      <View className="wardrobe-card__inner">
        <View
          className={[
            "wardrobe-card__image-wrap",
            isLarge && "wardrobe-card__image-wrap--large",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Image
            className="wardrobe-card__image"
            src={item.imageUrl || item.imageFileId}
            mode="aspectFill"
            radius="0"
          />
        </View>
        <View className="wardrobe-card__body">
          <Text className="wardrobe-card__category">{item.typeName}</Text>
          <Text
            className={[
              "wardrobe-card__name",
              isLarge && "wardrobe-card__name--large",
              isWide && "wardrobe-card__name--wide",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {item.name}
          </Text>
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
                    className="wardrobe-card__tag"
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
