import type {
  ImageUrlCacheCategory,
  ImageUrlCacheStore,
} from "@/types/image-url";

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
