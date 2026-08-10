import { RecognitionBatch } from "@/types/recognition";
import { getRecognitionBatchStatusLabel } from "@/utils/recognition-batch";
import MediaListCard from "@/components/MediaListCard";


import { formatDateTime } from "@/utils/format-date-time";
import { normalizeRecognitionErrorMessage } from "@/utils/recognition";

export interface RecognitionBatchCardProps {
  batch: RecognitionBatch;
  onClick?: (batch: RecognitionBatch) => void;
}

export default function RecognitionBatchCard({
  batch,
  onClick,
}: RecognitionBatchCardProps) {
  const statusLabel = getRecognitionBatchStatusLabel(batch);
  const description =
    batch.status === "failed"
      ? normalizeRecognitionErrorMessage(batch.errorMessage)
      : batch.status === "succeeded" && typeof batch.itemCount === "number"
        ? `衣物识别 · ${batch.itemCount} 件`
        : "衣物识别";

  return (
    <MediaListCard
      imageSrc={batch.coverUrl || batch.coverFileId || undefined}
      title={statusLabel}
      time={formatDateTime(batch.createdAt)}
      description={description}
      onClick={() => onClick?.(batch)}
    />
  );
}
