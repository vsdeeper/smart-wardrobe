/** 工作场景枚举 */
export type WorkScene =
  | "office"
  | "client-meeting"
  | "field"
  | "casual"
  | "social";

export const WORK_SCENE_OPTIONS: { value: WorkScene; label: string }[] = [
  { value: "office", label: "办公室" },
  { value: "client-meeting", label: "客户会面" },
  { value: "field", label: "外勤" },
  { value: "casual", label: "休闲日常" },
  { value: "social", label: "社交活动" },
];

/** 用户画像（云数据库 user_profiles，每用户一条） */
export interface UserProfile {
  _id?: string;
  heightCm: number;
  weightKg: number;
  occupation: string;
  workScenes: WorkScene[];
  styleTags: string[];
  updatedAt?: number;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  heightCm: 170,
  weightKg: 60,
  occupation: "",
  workScenes: ["office"],
  styleTags: [],
};
