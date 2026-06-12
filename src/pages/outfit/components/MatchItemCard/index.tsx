import { View, Text } from "@tarojs/components";
import { Check } from "@nutui/icons-react-taro";
import { Image } from "@nutui/nutui-react-taro";
import type { WardrobeItem } from "@/data/wardrobe";
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
  const series = item.tags?.[0] ?? item.typeName;

  return (
    <View
      className={["match-card", selected && "match-card--selected"]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onToggle(item)}
    >
      <View className="match-card__image-wrap">
        <Image
          className="match-card__image"
          src={item.imageUrl ?? ""}
          mode="aspectFill"
          radius="0"
        />
        {selected && (
          <View className="match-card__check">
            <Check size={14} color="var(--sw-color-on-primary)" />
          </View>
        )}
      </View>
      <View className="match-card__body">
        <Text className="match-card__series">{series}</Text>
        <Text className="match-card__name">{item.name}</Text>
      </View>
    </View>
  );
}
