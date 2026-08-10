import {
  DEFAULT_USER_DISPLAY_NAME,
  GENDER_DEFAULT_METRICS,
  GENDER_OPTIONS,
  PROFILE_EDITABLE_FIELDS,
} from "@/constants/profile";
import type { Gender, ProfileEditableField, UserProfile } from "@/types/profile";

const PROFILE_EDITABLE_FIELD_SET = new Set<string>(
  Object.keys(PROFILE_EDITABLE_FIELDS),
);

export function isProfileEditableField(
  value: string | undefined,
): value is ProfileEditableField {
  return value !== undefined && PROFILE_EDITABLE_FIELD_SET.has(value);
}

export function isGenderSet(gender?: string | null): gender is Gender {
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
