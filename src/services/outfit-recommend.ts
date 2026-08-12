import { WardrobeItem } from "@/types/wardrobe";
import { WeatherSnapshot } from "@/types/weather";
import { TryOnRecommendation } from "@/types/try-on";
import { UserProfile } from "@/types/profile";
import Taro from "@tarojs/taro";




import type { WardrobeItemsByType } from "@/services/wardrobe";
import { CREDITS_ERROR_INSUFFICIENT } from "@/constants/credits";
import { resolveCreditsToastMessage } from "@/utils/credits";

export interface RecommendOutfitInput {
  weather: WeatherSnapshot;
  season: string;
  profile: UserProfile;
  wardrobeByType: WardrobeItemsByType;
  plannedWearDateKey?: string;
}

export interface RecommendSelectedOutfitInput {
  weather: WeatherSnapshot;
  season: string;
  profile: UserProfile;
  selectedPieces: WardrobeItem[];
  plannedWearDateKey?: string;
}

export interface RecommendOutfitResult {
  recommendation: TryOnRecommendation;
}

interface RecommendCloudError {
  error: string;
  message: string;
}

interface RecommendCloudSuccess {
  recommendation: TryOnRecommendation;
}

function isError(
  data: RecommendCloudSuccess | RecommendCloudError
): data is RecommendCloudError {
  return "error" in data && typeof data.error === "string";
}

function toCloudWardrobe(byType: WardrobeItemsByType) {
  const result: Record<
    string,
    { id: string; name: string; tags: string[]; stylingAdvice?: string }[]
  > = {};
  for (const [typeName, items] of Object.entries(byType)) {
    result[typeName] = items.map((item) => ({
      id: item._id,
      name: item.name,
      tags: item.tags ?? [],
      stylingAdvice: item.stylingAdvice,
    }));
  }
  return result;
}

function groupSelectedPieces(
  selectedPieces: WardrobeItem[]
): WardrobeItemsByType {
  return selectedPieces.reduce<WardrobeItemsByType>((byType, item) => {
    (byType[item.typeName] ??= []).push(item);
    return byType;
  }, {});
}

async function callRecommendOutfit(
  input: Omit<RecommendOutfitInput, "wardrobeByType">,
  wardrobeByType: WardrobeItemsByType,
  mode: "recommend" | "selection"
): Promise<RecommendOutfitResult> {
  const { result } = await Taro.cloud.callFunction({
    name: "recommend-outfit",
    data: {
      mode,
      weather: input.weather,
      season: input.season,
      profile: input.profile,
      plannedWearDateKey: input.plannedWearDateKey,
      wardrobeByType: toCloudWardrobe(wardrobeByType),
    },
  });

  const data = result as RecommendCloudSuccess | RecommendCloudError;
  if (isError(data)) {
    const message = resolveCreditsToastMessage(data.message, data.error);
    const err = new Error(message);
    if (data.error === CREDITS_ERROR_INSUFFICIENT) {
      (err as Error & { code?: string }).code = CREDITS_ERROR_INSUFFICIENT;
    }
    throw err;
  }
  return {
    recommendation: data.recommendation,
  };
}

export function recommendOutfit(
  input: RecommendOutfitInput
): Promise<RecommendOutfitResult> {
  return callRecommendOutfit(input, input.wardrobeByType, "recommend");
}

export function recommendSelectedOutfit(
  input: RecommendSelectedOutfitInput
): Promise<RecommendOutfitResult> {
  return callRecommendOutfit(
    input,
    groupSelectedPieces(input.selectedPieces),
    "selection"
  );
}

export function resolveSelectedPieces(
  recommendation: TryOnRecommendation,
  allItems: WardrobeItem[]
): WardrobeItem[] {
  const map = new Map(allItems.map((item) => [item._id, item]));
  return recommendation.slots
    .map((slot) => map.get(slot.selectedId))
    .filter((item): item is WardrobeItem => Boolean(item));
}
