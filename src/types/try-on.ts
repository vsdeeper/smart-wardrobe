import type { WeatherSnapshot } from "@/types/weather";
import type { WardrobeItem } from "@/types/wardrobe";

export interface TryOnTip {
  id: number;
  icon: string;
  label: string;
}

export interface OutfitSlot {
  typeName: string;
  selectedId: string;
  alternatives: string[];
}

export interface TryOnRecommendation {
  outfitName: string;
  description: string;
  slots: OutfitSlot[];
  tips: TryOnTip[];
}

export interface TryOnDailyCache {
  dateKey: string;
  /** 直接进入试穿页时使用的 AI 推荐链路数据 */
  recommendation?: TryOnRecommendation;
  selectedPieces?: WardrobeItem[];
  /** 从搭配页手动选品后生成的 AI 搭评，与推荐链路互不回填 */
  selectedRecommendation?: TryOnRecommendation;
  manualSelectedPieces?: WardrobeItem[];
  weatherSnapshot?: WeatherSnapshot;
  /** 试穿效果图云存储 fileId；临时链见 imageUrlCache visualDiary 域 */
  heroCoverFileId?: string;
  /** 当前推荐是否已确认试穿并记录到视觉日记 */
  wearConfirmed?: boolean;
  cachedAt: number;
}

export interface VisualDiaryEntry {
  _id?: string;
  title: string;
  description: string;
  coverFileId?: string;
  coverUrl?: string;
  pieceIds: string[];
  tips?: TryOnTip[];
  weatherSnapshot?: WeatherSnapshot;
  createdAt: number;
}

export type TryOnDraftMode = "edit" | "saved";

export interface TryOnDraft {
  mode: TryOnDraftMode;
  description?: string;
  tips?: TryOnTip[];
  selectedPieces?: WardrobeItem[];
  baselinePieceIds?: string[];
  piecesChanged?: boolean;
}

export type TryOnRecommendStatus =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "empty"
  | "needsGender";

export type TryOnPreviewStatus = "idle" | "loading" | "success" | "error";
