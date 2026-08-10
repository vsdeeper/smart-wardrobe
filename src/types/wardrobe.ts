/** 衣物类型（云数据库 clothing_types） */
export interface ClothingType {
  _id: string;
  name: string;
  itemCount: number;
}

/** 衣橱单品（云数据库 wardrobe_items） */
export interface WardrobeItem {
  _id: string;
  name: string;
  typeId: string;
  typeName: string;
  imageFileId: string;
  imageUrl?: string;
  /** imageUrl 的生成时刻，用于判断该链接是否仍在有效期内 */
  imageUrlAt?: number;
  tags?: string[];
  createdAt: number;
  updatedAt?: number;
  stylingAdvice?: string;
}

/** AI 识别预览项（确认入库前，无 _id） */
export interface RecognizedPreviewItem {
  tempId: string;
  name: string;
  typeName: string;
  tags: string[];
  imageFileId: string;
  imageUrl?: string;
  stylingAdvice?: string;
}
