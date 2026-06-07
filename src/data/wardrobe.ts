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
