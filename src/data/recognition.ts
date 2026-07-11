import type { RecognizedPreviewItem } from "@/data/wardrobe"

/** 识别流水线状态 */
export type RecognitionBatchStatus = "processing" | "succeeded" | "failed"

/** 识别结果确认状态 */
export type RecognitionConfirmStatus = "pending" | "confirmed" | "discarded"

export interface RecognitionBatchProgress {
  current: number
  total: number
  phase?: "recognizing" | "generating"
}

/** 识别批次（云数据库 recognition_batches） */
export interface RecognitionBatch {
  _id: string
  status: RecognitionBatchStatus
  confirmStatus: RecognitionConfirmStatus
  sourceFileIds: string[]
  coverFileId?: string
  coverUrl?: string
  progress?: RecognitionBatchProgress
  items?: RecognizedPreviewItem[]
  itemCount?: number
  errorMessage?: string
  createdAt: number
  updatedAt?: number
  confirmedAt?: number
}

export const MINE_RECOGNITION_PREVIEW_LIMIT = 5

export const RECOGNITION_HISTORY_PAGE_SIZE = 20

/** 有 processing 批次时轮询间隔（ms） */
export const RECOGNITION_POLL_INTERVAL_MS = 3000

/** 识别中超时兜底：略长于云函数 timeout 300s */
export const RECOGNITION_STALE_MS = 6 * 60 * 1000

export function getRecognitionBatchStatusLabel(
  batch: Pick<RecognitionBatch, "status" | "confirmStatus" | "progress">,
): string {
  if (batch.status === "processing") {
    const { current, total } = batch.progress ?? {}
    if (current && total && total > 1) {
      return `识别中 ${current}/${total}`
    }
    return "识别中"
  }
  if (batch.status === "failed") {
    return "识别失败"
  }
  switch (batch.confirmStatus) {
    case "confirmed":
      return "已入库"
    case "discarded":
      return "已放弃"
    default:
      return "待确认"
  }
}

export function canOpenRecognitionBatch(
  batch: Pick<RecognitionBatch, "status">,
): boolean {
  return batch.status === "succeeded"
}
