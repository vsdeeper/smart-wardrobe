import type {
  ActiveTryOnModel,
  CustomTryOnModel,
  Gender,
  TryOnModelSource,
} from "@/types/profile";
import {
  PRESET_TRYON_MODEL_FILE_IDS,
  listPresetTryOnModelIds,
} from "@/constants/try-on-model";

export interface TryOnModelGalleryItem {
  key: string;
  source: TryOnModelSource;
  templateId?: string;
  fileId: string;
  label: string;
}

/** 预设 templateId 是否属于指定性别 */
export function isPresetTemplateForGender(
  templateId: string | undefined,
  gender: Gender,
): boolean {
  if (!templateId) return false;
  return templateId.startsWith(`${gender}-standard-`);
}

/** 启用中的预设模特是否与当前性别一致；自定义模特不受性别限制 */
export function isActiveTryOnModelCompatibleWithGender(
  active: ActiveTryOnModel | undefined,
  gender: Gender | undefined,
): boolean {
  if (!active || !gender) return true;
  if (active.source === "custom") return true;
  return isPresetTemplateForGender(active.templateId, gender);
}

/** 个人资料页 Cell 右侧摘要文案 */
export function getActiveTryOnModelSummaryLabel(
  active: ActiveTryOnModel | undefined,
): string {
  if (!active) return "未设置";
  return active.source === "custom" ? "本人" : "预设";
}

/**
 * 组装试穿模特页图库列表：预设（按性别）+ 自定义，顺序与网格一致。
 */
export function buildTryOnModelGalleryItems(
  gender: Gender,
  customModels: CustomTryOnModel[] = [],
): TryOnModelGalleryItem[] {
  const presets = listPresetTryOnModelIds(gender).map((templateId, index) => ({
    key: templateId,
    source: "preset" as const,
    templateId,
    fileId: PRESET_TRYON_MODEL_FILE_IDS[templateId],
    label: `预设 ${index + 1}`,
  }));

  const customs = customModels.map((item, index) => ({
    key: item.fileId,
    source: "custom" as const,
    fileId: item.fileId,
    label: `本人 ${index + 1}`,
  }));

  return [...presets, ...customs];
}

/** 判断图库项是否为当前启用模特 */
export function isTryOnModelItemActive(
  item: TryOnModelGalleryItem,
  active: ActiveTryOnModel | undefined,
): boolean {
  if (!active) return false;
  return active.fileId === item.fileId && active.source === item.source;
}

/** 从图库选中项构造启用态 payload */
export function toActiveTryOnModel(
  item: TryOnModelGalleryItem,
): ActiveTryOnModel {
  if (item.source === "preset") {
    return {
      source: "preset",
      templateId: item.templateId,
      fileId: item.fileId,
    };
  }
  return {
    source: "custom",
    fileId: item.fileId,
  };
}
