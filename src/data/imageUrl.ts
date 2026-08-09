/** 缓存域：衣橱单品 / 视觉日记封面 / 识别批次封面 / 用户头像 */
export type ImageUrlCacheCategory =
  | "wardrobe"
  | "visualDiary"
  | "recognition"
  | "avatar";

/** 单条 URL 缓存；fileId 为云存储 ID，非业务 _id */
export interface ImageUrlCacheEntry {
  fileId: string;
  url: string;
  at: number;
}

/**
 * 四域分区持久化结构（旧三域 storage 整包作废，不做迁移）。
 * - wardrobeList：`WardrobeItem.imageFileId`
 * - visualDiaryList：`VisualDiaryEntry.coverFileId`（仅封面）
 * - recognitionList：`RecognitionBatch.coverFileId`（仅封面，一图一批次）
 * - avatarList：`UserProfile.avatarFileId`
 */
export interface ImageUrlCacheStore {
  wardrobeList: ImageUrlCacheEntry[];
  visualDiaryList: ImageUrlCacheEntry[];
  recognitionList: ImageUrlCacheEntry[];
  avatarList: ImageUrlCacheEntry[];
}

/** category → store 字段名 */
export const IMAGE_URL_CACHE_CATEGORY_KEYS: Record<
  ImageUrlCacheCategory,
  keyof ImageUrlCacheStore
> = {
  wardrobe: "wardrobeList",
  visualDiary: "visualDiaryList",
  recognition: "recognitionList",
  avatar: "avatarList",
};

export function createEmptyImageUrlCacheStore(): ImageUrlCacheStore {
  return {
    wardrobeList: [],
    visualDiaryList: [],
    recognitionList: [],
    avatarList: [],
  };
}
