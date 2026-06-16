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

export type Gender = "male" | "female" | "unknown";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "unknown", label: "未设置" },
];

/** 用户画像（云数据库 user_profiles，每用户一条） */
export interface UserProfile {
  _id?: string;
  heightCm: number;
  weightKg: number;
  occupation: string;
  workScenes: WorkScene[];
  styleTags: string[];
  avatarFileId?: string;
  nickname?: string;
  gender?: Gender;
  phoneNumber?: string;
  updatedAt?: number;
}

export const PROFILE_HEIGHT_CM = { min: 100, max: 250 } as const;
export const PROFILE_WEIGHT_KG = { min: 30, max: 200 } as const;

export type ProfileMetric = "height" | "weight";

export const DEFAULT_USER_PROFILE: UserProfile = {
  heightCm: 170,
  weightKg: 60,
  occupation: "",
  workScenes: ["office"],
  styleTags: [],
  gender: "unknown",
};

export const DEFAULT_USER_DISPLAY_NAME = "衣橱用户";

export function getGenderLabel(gender?: Gender): string {
  return GENDER_OPTIONS.find((o) => o.value === gender)?.label ?? "未设置";
}

export function maskPhoneNumber(phone?: string): string {
  if (!phone || phone.length < 7) return "点击授权";
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function getUserDisplayName(
  profile: Pick<UserProfile, "nickname" | "occupation">,
): string {
  const nickname = profile.nickname?.trim();
  if (nickname) return nickname;
  const occupation = profile.occupation?.trim();
  if (occupation) return occupation;
  return DEFAULT_USER_DISPLAY_NAME;
}
