import { View, Text } from "@tarojs/components";
import { Image } from "@nutui/nutui-react-taro";
import type { RecognitionBatch } from "@/data/recognition";
import { getRecognitionBatchStatusLabel } from "@/data/recognition";
import { formatDateTime } from "@/utils/formatDateTime";
import "./index.scss";

export interface RecognitionBatchCardProps {
  batch: RecognitionBatch;
  onClick?: (batch: RecognitionBatch) => void;
}

export default function RecognitionBatchCard({
  batch,
  onClick,
}: RecognitionBatchCardProps) {
  const statusLabel = getRecognitionBatchStatusLabel(batch);
  const countLabel =
    batch.status === "succeeded" && typeof batch.itemCount === "number"
      ? `${batch.itemCount} 件`
      : batch.status === "processing"
        ? `${batch.sourceFileIds.length} 张`
        : null;

  return (
    <View
      className="recognition-batch-card card"
      onClick={() => onClick?.(batch)}
    >
      <View className="recognition-batch-card__media">
        {batch.coverUrl || batch.coverFileId ? (
          <Image
            className="recognition-batch-card__image"
            src={batch.coverUrl || batch.coverFileId || ""}
            mode="aspectFit"
            radius="0"
          />
        ) : (
          <View className="recognition-batch-card__placeholder" />
        )}
      </View>
      <View className="recognition-batch-card__body">
        <View className="recognition-batch-card__head">
          <Text className="recognition-batch-card__status">{statusLabel}</Text>
          <Text className="recognition-batch-card__time">
            {formatDateTime(batch.createdAt)}
          </Text>
        </View>
        <Text className="recognition-batch-card__desc">
          {batch.status === "failed"
            ? batch.errorMessage || "识别失败"
            : countLabel
              ? `衣物识别 · ${countLabel}`
              : "衣物识别"}
        </Text>
      </View>
    </View>
  );
}
