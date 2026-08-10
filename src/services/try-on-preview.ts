import { WeatherConditionCode } from "@/types/weather";
import { Gender } from "@/types/profile";


import Taro from "@tarojs/taro";

export interface GenerateTryonInput {
  imageFileIds: string[];
  heightCm: number;
  weightKg: number;
  gender: Gender;
  pieceLabels?: string[];
  pieceTypeNames?: string[];
  /** 当前天气，用于试穿图光影氛围；缺省时云端按晴天处理 */
  weatherConditionCode?: WeatherConditionCode;
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
