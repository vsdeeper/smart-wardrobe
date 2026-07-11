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
  /** 保暖等级 1–5，识别阶段写入 */
  warmthLevel?: number
  createdAt: number
  updatedAt?: number
  outfitRecommendation?: string
}

/** AI 识别预览项（确认入库前，无 _id） */
export interface RecognizedPreviewItem {
  tempId: string
  name: string
  typeName: string
  tags: string[]
  imageFileId: string
  imageUrl?: string
  /** 保暖等级 1–5，识别阶段写入 */
  warmthLevel?: number
}

export const WARDROBE_PAGE_SIZE = 20

/** FAB 批量上传时一次最多可选图片数 */
export const WARDROBE_BATCH_UPLOAD_MAX = 3

export const WARDROBE_ITEM_ACTION_OPTIONS = [
  { name: "查看", danger: false },
  { name: "编辑", danger: false },
  { name: "删除", danger: true },
]
