import type { RecognizedPreviewItem } from "@/types/wardrobe";

/** 识别流水线状态 */
export type RecognitionBatchStatus = "processing" | "succeeded" | "failed";

/** 识别结果确认状态 */
export type RecognitionConfirmStatus = "pending" | "confirmed" | "discarded";

export interface RecognitionBatchProgress {
  current: number;
  total: number;
  phase?: "recognizing" | "generating";
}

/** 识别批次（云数据库 recognition_batches，一图一批次） */
export interface RecognitionBatch {
  _id: string;
  status: RecognitionBatchStatus;
  confirmStatus: RecognitionConfirmStatus;
  /** 本批次唯一原图 / 列表封面 */
  coverFileId?: string;
  coverUrl?: string;
  progress?: RecognitionBatchProgress;
  items?: RecognizedPreviewItem[];
  itemCount?: number;
  errorMessage?: string;
  createdAt: number;
  updatedAt?: number;
  confirmedAt?: number;
}
