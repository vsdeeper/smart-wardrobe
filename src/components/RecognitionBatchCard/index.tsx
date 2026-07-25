import MediaListCard from "@/components/MediaListCard";
import type { RecognitionBatch } from "@/data/recognition";
import { getRecognitionBatchStatusLabel } from "@/data/recognition";
import { formatDateTime } from "@/utils/formatDateTime";
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
  const countLabel =
    batch.status === "succeeded" && typeof batch.itemCount === "number"
      ? `${batch.itemCount} 件`
      : batch.status === "processing"
        ? `${batch.sourceFileIds.length} 张`
        : null;

  const description =
    batch.status === "failed"
      ? normalizeRecognitionErrorMessage(batch.errorMessage)
      : countLabel
        ? `衣物识别 · ${countLabel}`
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
