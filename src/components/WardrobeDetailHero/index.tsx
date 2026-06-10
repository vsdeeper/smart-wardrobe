import { View } from "@tarojs/components";
import { Image } from "@nutui/nutui-react-taro";
import type { WardrobeItem } from "@/data/wardrobe";
import "./index.scss";

export interface WardrobeDetailHeroProps {
  item: WardrobeItem;
}

export default function WardrobeDetailHero({ item }: WardrobeDetailHeroProps) {
  return (
    <View className="wardrobe-detail-hero">
      <Image
        className="wardrobe-detail-hero__image"
        src={item.imageUrl || item.imageFileId}
        mode="aspectFill"
        radius="0"
      />
    </View>
  );
}
