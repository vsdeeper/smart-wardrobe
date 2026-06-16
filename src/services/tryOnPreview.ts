import type { Gender } from "@/data/profile";
import Taro from "@tarojs/taro";

export interface GenerateTryonInput {
  imageFileIds: string[];
  heightCm: number;
  weightKg: number;
  gender?: Gender;
  pieceLabels?: string[];
  pieceTypeNames?: string[];
}

export interface GenerateTryonResult {
  coverFileId?: string;
  coverUrl?: string;
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
