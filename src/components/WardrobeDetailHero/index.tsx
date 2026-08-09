import { View } from "@tarojs/components";
import { Image } from "@nutui/nutui-react-taro";
import type { WardrobeItem } from "@/data/wardrobe";
import { getCachedImageUrl } from "@/services/imageUrlCache";
import "./index.scss";

export interface WardrobeDetailHeroProps {
  item: WardrobeItem;
}

export default function WardrobeDetailHero({ item }: WardrobeDetailHeroProps) {
  const src = getCachedImageUrl("wardrobe", item.imageFileId);

  return (
    <View className="wardrobe-detail-hero">
      {src ? (
        <View className="wardrobe-detail-hero__image-wrap">
          <Image
            className="wardrobe-detail-hero__image"
            src={src}
            mode="aspectFill"
            radius="0"
          />
        </View>
      ) : null}
    </View>
  );
}
