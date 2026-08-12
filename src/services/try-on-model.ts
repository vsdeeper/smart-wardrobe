import { TRYON_MODEL } from "@/constants/credits";
import { type Gender } from "@/types/profile";
import Taro from "@tarojs/taro";

export interface GenerateTryOnModelResult {
  fileId?: string;
  coverUrl?: string;
  error?: string;
  message?: string;
  /** 生成时检测到的人物性别（仅成功且能明确判定时返回） */
  gender?: Gender;
}

/**
 * 上传用户全身参考照至云存储（单次一张）。
 */
export async function uploadTryOnModelSource(filePath: string): Promise<string> {
  const ext = filePath.includes(".")
    ? filePath.slice(filePath.lastIndexOf("."))
    : ".jpg";
  const cloudPath = `tryon-models/src/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const uploadRes = await Taro.cloud.uploadFile({
    cloudPath,
    filePath,
  });

  return uploadRes.fileID;
}

/**
 * 调用云函数生成本人试穿模特（50 积分/次）。
 */
export async function generateTryOnModel(params: {
  sourceFileId: string;
  gender: Gender;
}): Promise<GenerateTryOnModelResult> {
  const { result } = await Taro.cloud.callFunction({
    name: "generate-tryon-model",
    data: params,
  });

  return (result ?? {}) as GenerateTryOnModelResult;
}

/** 生成本人模特所需积分（与云函数 TRYON_MODEL 对齐） */
export const TRYON_MODEL_CREDIT_COST = TRYON_MODEL;
