import { DEFAULT_USER_PROFILE } from "@/constants/profile";
import { isGenderSet } from "@/utils/profile";
import {
  type ActiveTryOnModel,
  type CustomTryOnModel,
  type Gender,
  type UserProfile,
} from "@/types/profile";
import Taro from "@tarojs/taro";


function normalizeGender(raw: unknown): Gender | undefined {
  if (raw === "male" || raw === "female") {
    return raw;
  }
  return undefined;
}

function normalizeActiveTryOnModel(raw: unknown): ActiveTryOnModel | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const item = raw as ActiveTryOnModel;
  if (item.source !== "preset" && item.source !== "custom") return undefined;
  if (typeof item.fileId !== "string" || !item.fileId.trim()) return undefined;
  const templateId =
    typeof item.templateId === "string" && item.templateId.trim()
      ? item.templateId.trim()
      : undefined;
  return {
    source: item.source,
    templateId,
    fileId: item.fileId.trim(),
  };
}

function normalizeCustomTryOnModels(raw: unknown): CustomTryOnModel[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as CustomTryOnModel;
      if (typeof item.fileId !== "string" || !item.fileId.trim()) return null;
      if (typeof item.createdAt !== "number") return null;
      return {
        fileId: item.fileId.trim(),
        createdAt: item.createdAt,
      };
    })
    .filter(Boolean) as CustomTryOnModel[];
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
    activeTryOnModel: normalizeActiveTryOnModel(raw.activeTryOnModel),
    customTryOnModels: normalizeCustomTryOnModels(raw.customTryOnModels),
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
  if (profile.activeTryOnModel) {
    data.activeTryOnModel = profile.activeTryOnModel;
  }
  if (Array.isArray(profile.customTryOnModels)) {
    data.customTryOnModels = profile.customTryOnModels;
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

/**
 * 从 user_profiles 移除指定字段（如云数据库需 _.remove() 的场景）。
 */
export async function removeUserProfileFields(
  profileId: string,
  fields: Array<"activeTryOnModel">,
): Promise<void> {
  if (fields.length === 0) return;
  const db = Taro.cloud.database();
  const _ = db.command;
  const data: Record<string, unknown> = { updatedAt: Date.now() };
  for (const field of fields) {
    data[field] = _.remove();
  }
  await db.collection("user_profiles").doc(profileId).update({ data });
}
