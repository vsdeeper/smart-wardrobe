import { getGenderDefaultMetrics } from "@/utils/profile";
import { type Gender, type UserProfile } from "@/types/profile";
import Taro from "@tarojs/taro";

import { fetchUserProfile, saveUserProfile } from "@/services/profile";
import {
  readProfileCache,
  writeProfileCache,
} from "@/services/profile-cache";
import { clearTryOnCache } from "@/services/try-on-cache";

export async function applyGenderSetup(gender: Gender): Promise<UserProfile> {
  const cached = readProfileCache();
  const current = cached?.profile ?? (await fetchUserProfile());
  const metrics = getGenderDefaultMetrics(gender);

  const next: UserProfile = {
    ...current,
    gender,
    heightCm: metrics.heightCm,
    weightKg: metrics.weightKg,
  };

  const saved = await saveUserProfile(next);
  clearTryOnCache();

  writeProfileCache({
    profile: saved,
    itemCount: cached?.itemCount ?? 0,
    cachedAt: Date.now(),
  });

  return saved;
}

export async function applyGenderSetupWithToast(
  gender: Gender,
): Promise<UserProfile | null> {
  try {
    return await applyGenderSetup(gender);
  } catch {
    Taro.showToast({ title: "保存失败，请稍后重试", icon: "none" });
    return null;
  }
}
