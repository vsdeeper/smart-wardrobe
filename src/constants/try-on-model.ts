import type { Gender } from "@/types/profile";

/** 自定义试穿模特上限 */
export const CUSTOM_TRYON_MODEL_MAX = 3;

/** 预设试穿模特 fileID（与 cloudfunctions/generate-tryon-image/constants/model-template-file-ids.js 对齐） */
export const PRESET_TRYON_MODEL_FILE_IDS: Record<string, string> = {
  "female-standard-01":
    "cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/models/female-standard-01-1920.jpg",
  "female-standard-02":
    "cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/models/female-standard-02-1920.jpg",
  "female-standard-03":
    "cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/models/female-standard-03-1920.jpg",
  "male-standard-01":
    "cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/models/male-standard-01-1920.jpg",
  "male-standard-02":
    "cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/models/male-standard-02-1920.jpg",
  "male-standard-03":
    "cloud://cloudbase-d6gkz1xlx9adbfe51.636c-cloudbase-d6gkz1xlx9adbfe51-1439947849/models/male-standard-03-1920.jpg",
};

const PRESET_VARIANTS = ["01", "02", "03"] as const;

/**
 * 按性别返回可用预设模特 templateId 列表（仅 *-standard-*）。
 */
export function listPresetTryOnModelIds(gender: Gender): string[] {
  return PRESET_VARIANTS.map((variant) => `${gender}-standard-${variant}`).filter(
    (templateId) => Boolean(PRESET_TRYON_MODEL_FILE_IDS[templateId]),
  );
}

/**
 * 生成本人模特时固定使用的着装参考 preset（同性别 standard-01）。
 */
export function getOutfitReferenceTemplateId(gender: Gender): string {
  return `${gender}-standard-01`;
}
