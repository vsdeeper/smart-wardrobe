export type Gender = "male" | "female";

export type TryOnModelSource = "preset" | "custom";

/** 当前启用的试穿模特（全局唯一） */
export interface ActiveTryOnModel {
  source: TryOnModelSource;
  /** 预设键，如 female-standard-01；自定义可省略 */
  templateId?: string;
  fileId: string;
}

/** 本人生成的试穿模特 */
export interface CustomTryOnModel {
  fileId: string;
  createdAt: number;
}

/** 用户画像（云数据库 user_profiles，每用户一条） */
export interface UserProfile {
  _id?: string;
  heightCm?: number;
  weightKg?: number;
  occupation: string;
  styleTags: string[];
  avatarFileId?: string;
  nickname?: string;
  gender?: Gender;
  activeTryOnModel?: ActiveTryOnModel;
  customTryOnModels?: CustomTryOnModel[];
  updatedAt?: number;
}

export type ProfileMetric = "height" | "weight";

export type ProfileEditableField =
  | "gender"
  | "height"
  | "weight"
  | "occupation";
