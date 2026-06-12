import Taro from "@tarojs/taro";
import type { UserProfile } from "@/data/profile";
import type { TryOnRecommendation } from "@/data/tryOn";
import type { WeatherSnapshot } from "@/data/weather";
import type { WardrobeItem } from "@/data/wardrobe";
import type { WardrobeItemsByType } from "@/services/wardrobe";

export interface RecommendOutfitInput {
  weather: WeatherSnapshot;
  season: string;
  profile: UserProfile;
  wardrobeByType: WardrobeItemsByType;
}

interface RecommendCloudError {
  error: string;
  message: string;
}

interface RecommendCloudSuccess {
  recommendation: TryOnRecommendation;
}

function isError(
  data: RecommendCloudSuccess | RecommendCloudError,
): data is RecommendCloudError {
  return "error" in data && typeof data.error === "string";
}

function toCloudWardrobe(byType: WardrobeItemsByType) {
  const result: Record<
    string,
    { id: string; name: string; tags: string[]; warmthLevel?: number }[]
  > = {};
  for (const [typeName, items] of Object.entries(byType)) {
    result[typeName] = items.map((item) => ({
      id: item._id,
      name: item.name,
      tags: item.tags ?? [],
      warmthLevel: item.warmthLevel,
    }));
  }
  return result;
}

export async function recommendOutfit(
  input: RecommendOutfitInput,
): Promise<TryOnRecommendation> {
  const { result } = await Taro.cloud.callFunction({
    name: "recommend-outfit",
    data: {
      weather: input.weather,
      season: input.season,
      profile: input.profile,
      wardrobeByType: toCloudWardrobe(input.wardrobeByType),
    },
  });

  const data = result as RecommendCloudSuccess | RecommendCloudError;
  if (isError(data)) {
    throw new Error(data.message || data.error);
  }
  return data.recommendation;
}

export function resolveSelectedPieces(
  recommendation: TryOnRecommendation,
  allItems: WardrobeItem[],
): WardrobeItem[] {
  const map = new Map(allItems.map((item) => [item._id, item]));
  return recommendation.slots
    .map((slot) => map.get(slot.selectedId))
    .filter((item): item is WardrobeItem => Boolean(item));
}
