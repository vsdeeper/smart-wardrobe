import { WardrobeItem } from "@/types/wardrobe";
import { View } from "@tarojs/components";
import { Check } from "@nutui/icons-react-taro";
import { Image } from "@nutui/nutui-react-taro";

import { getCachedImageUrl } from "@/services/image-url-cache";
import "./index.scss";

export interface MatchItemCardProps {
  item: WardrobeItem;
  selected: boolean;
  onToggle: (item: WardrobeItem) => void;
}

export default function MatchItemCard({
  item,
  selected,
  onToggle,
}: MatchItemCardProps) {
  return (
    <View
      className={["match-card", selected && "match-card--selected"]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onToggle(item)}
    >
      <View className="match-card__inner">
        <View className="match-card__image-wrap">
          <Image
            className="match-card__image"
            src={getCachedImageUrl("wardrobe", item.imageFileId)}
            mode="aspectFill"
            radius="0"
          />
          {selected && (
            <View className="match-card__check">
              <Check size={8} color="var(--nutui-color-primary-text)" />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
