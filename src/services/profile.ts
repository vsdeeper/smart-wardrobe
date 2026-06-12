import Taro from "@tarojs/taro";
import {
  DEFAULT_USER_PROFILE,
  type UserProfile,
  type WorkScene,
} from "@/data/profile";

const ALLOWED_SCENES = new Set<WorkScene>([
  "office",
  "client-meeting",
  "field",
  "casual",
  "social",
]);

function normalizeWorkScenes(raw: unknown): WorkScene[] {
  if (!Array.isArray(raw)) return DEFAULT_USER_PROFILE.workScenes;
  const scenes = raw
    .map((item) => String(item ?? "").trim())
    .filter((item): item is WorkScene => ALLOWED_SCENES.has(item as WorkScene));
  return scenes.length > 0 ? scenes : DEFAULT_USER_PROFILE.workScenes;
}

function normalizeProfile(raw: Record<string, unknown>): UserProfile {
  return {
    _id: raw._id ? String(raw._id) : undefined,
    heightCm:
      typeof raw.heightCm === "number"
        ? raw.heightCm
        : DEFAULT_USER_PROFILE.heightCm,
    weightKg:
      typeof raw.weightKg === "number"
        ? raw.weightKg
        : DEFAULT_USER_PROFILE.weightKg,
    occupation:
      typeof raw.occupation === "string"
        ? raw.occupation
        : DEFAULT_USER_PROFILE.occupation,
    workScenes: normalizeWorkScenes(raw.workScenes),
    styleTags: Array.isArray(raw.styleTags)
      ? raw.styleTags.map(String)
      : DEFAULT_USER_PROFILE.styleTags,
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
  const data = {
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    occupation: profile.occupation.trim(),
    workScenes: profile.workScenes,
    styleTags: profile.styleTags,
    updatedAt: now,
  };

  if (profile._id) {
    await db.collection("user_profiles").doc(profile._id).update({ data });
    return { ...profile, ...data, updatedAt: now };
  }

  const addRes = await db.collection("user_profiles").add({ data });
  return { ...profile, ...data, _id: addRes._id as string, updatedAt: now };
}
