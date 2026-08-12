import type { ImageUrlCacheStore } from "@/types/image-url";

export function createEmptyImageUrlCacheStore(): ImageUrlCacheStore {
  return {
    wardrobeList: [],
    visualDiaryList: [],
    recognitionList: [],
    avatarList: [],
    tryOnModelList: [],
  };
}
