import {
  PROFILE_HEIGHT_CM,
  PROFILE_WEIGHT_KG,
  type ProfileMetric,
} from "@/data/profile";

export const METRIC_INVALID_TOAST: Record<ProfileMetric, string> = {
  height: "请输入合理的身高",
  weight: "请输入合理的体重",
};

export function parseMetricValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
  return value;
}

export function isValidMetric(metric: ProfileMetric, value: number): boolean {
  if (metric === "height") {
    return value >= PROFILE_HEIGHT_CM.min && value <= PROFILE_HEIGHT_CM.max;
  }
  return value >= PROFILE_WEIGHT_KG.min && value <= PROFILE_WEIGHT_KG.max;
}
