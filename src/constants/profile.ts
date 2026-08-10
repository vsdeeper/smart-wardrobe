import type { Gender, ProfileEditableField, UserProfile } from "@/types/profile";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
];

export const PROFILE_HEIGHT_CM = { min: 100, max: 250 } as const;
export const PROFILE_WEIGHT_KG = { min: 30, max: 200 } as const;

export const GENDER_DEFAULT_METRICS: Record<
  Gender,
  { heightCm: number; weightKg: number }
> = {
  female: { heightCm: 165, weightKg: 55 },
  male: { heightCm: 175, weightKg: 70 },
};

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

export const DEFAULT_USER_PROFILE: UserProfile = {
  occupation: "",
  styleTags: [],
};

export const DEFAULT_USER_DISPLAY_NAME = "衣橱用户";
