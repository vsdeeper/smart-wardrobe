import type { TryOnModelGalleryItem } from "@/utils/try-on-model";
import { View, Text } from "@tarojs/components";
import { Check, Close } from "@nutui/icons-react-taro";
import { Image } from "@nutui/nutui-react-taro";
import { getCachedImageUrl } from "@/services/image-url-cache";
import "./index.scss";

export interface ModelCardProps {
  item: TryOnModelGalleryItem;
  selected: boolean;
  active: boolean;
  onSelect: (item: TryOnModelGalleryItem) => void;
  onDelete?: (item: TryOnModelGalleryItem) => void;
}

export default function ModelCard({
  item,
  selected,
  active,
  onSelect,
  onDelete,
}: ModelCardProps) {
  const imageSrc = getCachedImageUrl("tryOnModel", item.fileId) || item.fileId;

  return (
    <View
      className={[
        "model-card",
        selected && "model-card--selected",
        active && "model-card--active",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSelect(item)}
    >
      <View className="model-card__inner">
        <View className="model-card__image-wrap">
          <Image
            className="model-card__image"
            src={imageSrc}
            mode="aspectFill"
            radius="0"
          />
          {selected ? (
            <View className="model-card__check">
              <Check size={8} color="var(--nutui-color-primary-text)" />
            </View>
          ) : null}
          {active ? (
            <View className="model-card__active-tag">
              <Text className="model-card__active-tag-text">启用中</Text>
            </View>
          ) : null}
          {item.source === "custom" && onDelete ? (
            <View
              className="model-card__delete"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(item);
              }}
            >
              <Close size={10} color="var(--nutui-color-primary-text)" />
            </View>
          ) : null}
        </View>
        <Text className="model-card__label">{item.label}</Text>
      </View>
    </View>
  );
}
