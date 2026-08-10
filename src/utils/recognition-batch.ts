import type { RecognitionBatch } from "@/types/recognition";

export function getRecognitionBatchStatusLabel(
  batch: Pick<RecognitionBatch, "status" | "confirmStatus">,
): string {
  if (batch.status === "processing") {
    return "识别中";
  }
  if (batch.status === "failed") {
    return "识别失败";
  }
  switch (batch.confirmStatus) {
    case "confirmed":
      return "已入库";
    case "discarded":
      return "已放弃";
    default:
      return "待确认";
  }
}

export function canOpenRecognitionBatch(
  batch: Pick<RecognitionBatch, "status">,
): boolean {
  return batch.status === "succeeded";
}
