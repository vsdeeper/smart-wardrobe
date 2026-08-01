export type Gender = "male" | "female";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
];

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
  updatedAt?: number;
}

export const PROFILE_HEIGHT_CM = { min: 100, max: 250 } as const;
export const PROFILE_WEIGHT_KG = { min: 30, max: 200 } as const;

export const GENDER_DEFAULT_METRICS: Record<
  Gender,
  { heightCm: number; weightKg: number }
> = {
  female: { heightCm: 165, weightKg: 55 },
  male: { heightCm: 175, weightKg: 70 },
};

export type ProfileMetric = "height" | "weight";

export type ProfileEditableField =
  | "gender"
  | "height"
  | "weight"
  | "occupation";

export const PROFILE_EDITABLE_FIELDS: Record<
  ProfileEditableField,
  { title: string; placeholder?: string; hint?: string }
> = {
  gender: { title: "性别" },
  height: {
    title: "身高",
    placeholder: "请输入身高（cm）",
    hint: `有效范围 ${PROFILE_HEIGHT_CM.min}–${PROFILE_HEIGHT_CM.max} cm`,
  },
  weight: {
    title: "体重",
    placeholder: "请输入体重（kg）",
    hint: `有效范围 ${PROFILE_WEIGHT_KG.min}–${PROFILE_WEIGHT_KG.max} kg`,
  },
  occupation: { title: "职业", placeholder: "请输入职业" },
};

const PROFILE_EDITABLE_FIELD_SET = new Set<string>(
  Object.keys(PROFILE_EDITABLE_FIELDS),
);

export function isProfileEditableField(
  value: string | undefined,
): value is ProfileEditableField {
  return value !== undefined && PROFILE_EDITABLE_FIELD_SET.has(value);
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  occupation: "",
  styleTags: [],
};

export const DEFAULT_USER_DISPLAY_NAME = "衣橱用户";

export function isGenderSet(gender?: string): gender is Gender {
  return gender === "male" || gender === "female";
}

export function isMetricsSet(
  profile: Pick<UserProfile, "heightCm" | "weightKg">,
): boolean {
  return (
    typeof profile.heightCm === "number" &&
    typeof profile.weightKg === "number"
  );
}

export function getGenderDefaultMetrics(gender: Gender): {
  heightCm: number;
  weightKg: number;
} {
  return GENDER_DEFAULT_METRICS[gender];
}

export function getGenderLabel(gender?: Gender): string {
  if (!isGenderSet(gender)) return "请设置";
  return GENDER_OPTIONS.find((o) => o.value === gender)?.label ?? "请设置";
}

export function formatHeightLabel(heightCm?: number): string {
  if (typeof heightCm !== "number") return "请设置";
  return `${heightCm} cm`;
}

export function formatWeightLabel(weightKg?: number): string {
  if (typeof weightKg !== "number") return "请设置";
  return `${weightKg} kg`;
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
