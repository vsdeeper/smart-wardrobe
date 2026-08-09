import { View, Text } from "@tarojs/components";
import { Image } from "@nutui/nutui-react-taro";
import type { WardrobeItem } from "@/data/wardrobe";
import { getCachedImageUrl } from "@/services/imageUrlCache";
import "./index.scss";

export interface WardrobeItemCardProps {
  item: WardrobeItem;
  onClick?: (item: WardrobeItem) => void;
  onLongPress?: (item: WardrobeItem) => void;
  onImageError?: (item: WardrobeItem) => void;
}

export default function WardrobeItemCard({
  item,
  onClick,
  onLongPress,
  onImageError,
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
            src={getCachedImageUrl("wardrobe", item.imageFileId)}
            mode="aspectFill"
            radius="0"
            onError={() => onImageError?.(item)}
          />
        </View>
        <View className="wardrobe-card__body">
          <Text className="wardrobe-card__name">{item.name}</Text>
        </View>
      </View>
    </View>
  );
}
