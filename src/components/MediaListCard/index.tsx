import { View, Text } from "@tarojs/components";
import { Image } from "@nutui/nutui-react-taro";
import "./index.scss";

export interface MediaListCardProps {
  imageSrc?: string;
  title: string;
  time: string;
  description: string;
  onClick?: () => void;
}

export default function MediaListCard({
  imageSrc,
  title,
  time,
  description,
  onClick,
}: MediaListCardProps) {
  return (
    <View
      className="media-list-card card border-radius-unset"
      onClick={onClick}
    >
      <View className="media-list-card__media">
        {imageSrc ? (
          <Image
            className="media-list-card__image"
            src={imageSrc}
            mode="aspectFit"
            radius="0"
          />
        ) : (
          <View className="media-list-card__placeholder" />
        )}
      </View>
      <View className="media-list-card__body">
        <View className="media-list-card__head">
          <Text className="media-list-card__title">{title}</Text>
          <Text className="media-list-card__time">{time}</Text>
        </View>
        <Text className="media-list-card__desc">{description}</Text>
      </View>
    </View>
  );
}
