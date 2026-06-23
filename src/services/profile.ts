import Taro from "@tarojs/taro";
import {
  DEFAULT_USER_PROFILE,
  isGenderSet,
  type Gender,
  type UserProfile,
} from "@/data/profile";

function normalizeGender(raw: unknown): Gender | undefined {
  if (raw === "male" || raw === "female") {
    return raw;
  }
  return undefined;
}

function normalizeProfile(raw: Record<string, unknown>): UserProfile {
  return {
    _id: raw._id ? String(raw._id) : undefined,
    heightCm:
      typeof raw.heightCm === "number" ? raw.heightCm : undefined,
    weightKg:
      typeof raw.weightKg === "number" ? raw.weightKg : undefined,
    occupation:
      typeof raw.occupation === "string"
        ? raw.occupation
        : DEFAULT_USER_PROFILE.occupation,
    styleTags: Array.isArray(raw.styleTags)
      ? raw.styleTags.map(String)
      : DEFAULT_USER_PROFILE.styleTags,
    avatarFileId:
      typeof raw.avatarFileId === "string" && raw.avatarFileId.trim()
        ? raw.avatarFileId
        : undefined,
    nickname: typeof raw.nickname === "string" ? raw.nickname : undefined,
    gender: normalizeGender(raw.gender),
    phoneNumber:
      typeof raw.phoneNumber === "string" ? raw.phoneNumber : undefined,
    updatedAt:
      typeof raw.updatedAt === "number"
        ? raw.updatedAt
        : undefined,
  };
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const db = Taro.cloud.database();
  const res = await db.collection("user_profiles").limit(1).get();
  const raw = res.data[0] as Record<string, unknown> | undefined;
  if (!raw) return { ...DEFAULT_USER_PROFILE };
  return normalizeProfile(raw);
}

export async function saveUserProfile(
  profile: UserProfile,
): Promise<UserProfile> {
  const db = Taro.cloud.database();
  const now = Date.now();
  const data: Record<string, unknown> = {
    occupation: profile.occupation.trim(),
    styleTags: profile.styleTags,
    avatarFileId: profile.avatarFileId ?? "",
    nickname: profile.nickname?.trim() ?? "",
    phoneNumber: profile.phoneNumber ?? "",
    updatedAt: now,
  };

  if (isGenderSet(profile.gender)) {
    data.gender = profile.gender;
  }
  if (typeof profile.heightCm === "number") {
    data.heightCm = profile.heightCm;
  }
  if (typeof profile.weightKg === "number") {
    data.weightKg = profile.weightKg;
  }

  if (profile._id) {
    await db.collection("user_profiles").doc(profile._id).update({ data });
    return { ...profile, ...data, updatedAt: now } as UserProfile;
  }

  const addRes = await db.collection("user_profiles").add({ data });
  return {
    ...profile,
    ...data,
    _id: addRes._id as string,
    updatedAt: now,
  } as UserProfile;
}
