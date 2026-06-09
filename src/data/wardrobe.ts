/** 衣物类型（云数据库 clothing_types） */
export interface ClothingType {
  _id: string
  name: string
  itemCount: number
}

/** 衣橱单品（云数据库 wardrobe_items） */
export interface WardrobeItem {
  _id: string
  name: string
  typeId: string
  typeName: string
  imageFileId: string
  imageUrl?: string
  tags?: string[]
  createdAt: number
}

export const WARDROBE_PAGE_SIZE = 20

/** FAB 批量上传时一次最多可选图片数 */
export const WARDROBE_BATCH_UPLOAD_MAX = 3

export type AiPhase = "idle" | "uploading" | "recognizing" | "done"

export interface AiStatus {
  phase: AiPhase
  progress: number
  totalCount: number
  batchCurrent?: number
  batchTotal?: number
}

export function isAiBusy(phase: AiPhase): boolean {
  return phase === "uploading" || phase === "recognizing" || phase === "done"
}

export function getAiStatusDesc(status: AiStatus): string {
  const batchLabel =
    status.batchTotal && status.batchTotal > 1 && status.batchCurrent
      ? `${status.batchCurrent}/${status.batchTotal}`
      : null

  switch (status.phase) {
    case "uploading":
      return batchLabel ? `正在上传 ${batchLabel}...` : "正在上传图片..."
    case "recognizing":
      return batchLabel
        ? `正在识别 ${batchLabel}...`
        : "AI 正在识别衣物类型..."
    case "done":
      return "分类完成"
    default:
      return status.totalCount > 0
        ? `已分类 ${status.totalCount} 件单品`
        : "上传衣物照片，AI 将自动识别分类"
  }
}

export const WARDROBE_ITEM_ACTION_OPTIONS = [
  { name: "查看", danger: false },
  { name: "编辑", danger: false },
  { name: "删除", danger: true },
]
