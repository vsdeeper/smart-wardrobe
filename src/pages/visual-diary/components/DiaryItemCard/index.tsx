import { View, Text } from "@tarojs/components";
import { Image } from "@nutui/nutui-react-taro";
import type { VisualDiaryEntry } from "@/data/tryOn";
import { formatDateTime } from "@/utils/formatDateTime";
import "./index.scss";

export interface DiaryItemCardProps {
  entry: VisualDiaryEntry;
}

export default function DiaryItemCard({ entry }: DiaryItemCardProps) {
  return (
    <View className="diary-item-card">
      <View className="diary-item-card__media">
        <Image
          className="diary-item-card__image"
          src={entry.coverUrl || entry.coverFileId || ""}
          mode="aspectFit"
          radius="0"
        />
      </View>
      <View className="diary-item-card__body">
        <View className="diary-item-card__head">
          <Text className="diary-item-card__title">{entry.title}</Text>
          <Text className="diary-item-card__time">
            {formatDateTime(entry.createdAt)}
          </Text>
        </View>
        <Text className="diary-item-card__desc">{entry.description}</Text>
      </View>
    </View>
  );
}
