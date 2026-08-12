import { WeatherConditionCode } from "@/types/weather";
import { Gender } from "@/types/profile";


import Taro from "@tarojs/taro";
import { resolveCreditsToastMessage } from "@/utils/credits";

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
  const data = result as GenerateTryonResult;
  if (data.error) {
    return {
      ...data,
      message: resolveCreditsToastMessage(
        data.message || data.error,
        data.error,
      ),
    };
  }
  return data;
}
