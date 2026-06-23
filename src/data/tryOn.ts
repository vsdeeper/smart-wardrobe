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
  matchScore: number;
  slots: OutfitSlot[];
  tips: TryOnTip[];
}

export interface TryOnDailyCache {
  dateKey: string;
  recommendation: TryOnRecommendation;
  selectedPieces: WardrobeItem[];
  heroCoverFileId?: string;
  heroImageUrl?: string;
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
  matchScore?: number;
  weatherSnapshot?: WeatherSnapshot;
  createdAt: number;
}

export type TryOnDraftMode = "wardrobe-cta" | "edit" | "saved";

export interface TryOnDraft {
  mode: TryOnDraftMode;
  outfitName?: string;
  description?: string;
  matchScore?: number;
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
