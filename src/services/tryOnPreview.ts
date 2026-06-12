import Taro from "@tarojs/taro";
import type { WardrobeItem } from "@/data/wardrobe";

export interface GenerateTryonInput {
  imageFileIds: string[];
  heightCm: number;
  weightKg: number;
  outfitName: string;
  description: string;
}

export interface GenerateTryonResult {
  coverFileId?: string;
  coverUrl?: string;
  fallback?: boolean;
  error?: string;
  message?: string;
}

export async function generateTryonImage(
  input: GenerateTryonInput,
): Promise<GenerateTryonResult> {
  const { result } = await Taro.cloud.callFunction({
    name: "generate-tryon-image",
    data: input,
  });
  return result as GenerateTryonResult;
}

/** Hero 拼贴回退：取第一件有图的单品 */
export function buildCollageHeroUrl(pieces: WardrobeItem[]): string | null {
  const first = pieces.find((p) => p.imageUrl || p.imageFileId);
  return first?.imageUrl ?? null;
}
