import type { WeatherSnapshot } from "@/data/weather";
import type { WardrobeItem } from "@/data/wardrobe";

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
  recommendation: TryOnRecommendation;
  selectedPieces: WardrobeItem[];
  weatherSnapshot?: WeatherSnapshot;
  heroCoverFileId?: string;
  heroImageUrl?: string;
  /** heroImageUrl 的生成时刻，用于判断云存储临时链接是否仍可复用 */
  heroImageUrlAt?: number;
  cachedAt: number;
}

export const MINE_DIARY_PREVIEW_LIMIT = 6;
export const VISUAL_DIARY_PAGE_SIZE = 20;

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
