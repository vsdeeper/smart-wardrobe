import { DEFAULT_USER_PROFILE } from "@/constants/profile";
import { type UserProfile } from "@/types/profile";
import Taro from "@tarojs/taro";

import { fetchUserProfile } from "@/services/profile";
import { resolveAvatarUrl } from "@/services/profile-avatar";
import {
  getCachedImageUrl,
  putImageUrlCache,
  removeImageUrlCache,
} from "@/services/image-url-cache";
import { fetchWardrobeItemCount } from "@/services/wardrobe";

export interface ProfileCacheEntry {
  profile: UserProfile;
  itemCount: number;
  cachedAt: number;
}

export interface InitialProfileState {
  profile: UserProfile;
  avatarUrl?: string;
  itemCount: number;
  hasCache: boolean;
}

const LEGACY_STORAGE_KEY = "sw_user_profile_cache";

let memoryCache: ProfileCacheEntry | null = null;
let legacyStorageCleared = false;
let inflightPromise: Promise<ProfileCacheEntry | null> | null = null;

function ensureLegacyStorageCleared(): void {
  if (legacyStorageCleared) return;
  legacyStorageCleared = true;
  try {
    Taro.removeStorageSync(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function isValidProfile(raw: unknown): raw is UserProfile {
  if (!raw || typeof raw !== "object") return false;
  const profile = raw as UserProfile;
  if (typeof profile.occupation !== "string" || !Array.isArray(profile.styleTags)) {
    return false;
  }
  if (
    profile.heightCm !== undefined &&
    typeof profile.heightCm !== "number"
  ) {
    return false;
  }
  if (
    profile.weightKg !== undefined &&
    typeof profile.weightKg !== "number"
  ) {
    return false;
  }
  return true;
}

function isValidEntry(raw: unknown): raw is ProfileCacheEntry {
  return (
    !!raw &&
    typeof raw === "object" &&
    isValidProfile((raw as ProfileCacheEntry).profile) &&
    typeof (raw as ProfileCacheEntry).itemCount === "number" &&
    typeof (raw as ProfileCacheEntry).cachedAt === "number"
  );
}

export function getAvatarDisplayUrl(fileId?: string): string | undefined {
  if (!fileId?.trim()) return undefined;
  const url = getCachedImageUrl("avatar", fileId);
  return url && url !== fileId ? url : undefined;
}

async function resolveAndCacheAvatar(
  fileId: string,
  forceRefresh = false,
): Promise<string | undefined> {
  if (!forceRefresh) {
    const cached = getAvatarDisplayUrl(fileId);
    if (cached) return cached;
  } else {
    removeImageUrlCache("avatar", fileId);
  }

  const url = await resolveAvatarUrl(fileId);
  if (url) {
    putImageUrlCache("avatar", fileId, url);
  }
  return url ?? undefined;
}

export function invalidateAvatarUrl(): void {
  const fileId = readProfileCache()?.profile.avatarFileId;
  if (!fileId) return;
  removeImageUrlCache("avatar", fileId);
}

export async function refreshAvatarUrl(): Promise<string | undefined> {
  const fileId = readProfileCache()?.profile.avatarFileId;
  if (!fileId) return undefined;
  return resolveAndCacheAvatar(fileId, true);
}

export function readProfileCache(): ProfileCacheEntry | null {
  ensureLegacyStorageCleared();
  if (!memoryCache || !isValidEntry(memoryCache)) {
    return null;
  }
  return memoryCache;
}

export function writeProfileCache(entry: ProfileCacheEntry): void {
  ensureLegacyStorageCleared();
  memoryCache = {
    profile: entry.profile,
    itemCount: entry.itemCount,
    cachedAt: entry.cachedAt,
  };
}

export function clearProfileCache(): void {
  ensureLegacyStorageCleared();
  memoryCache = null;
}

export function getInitialProfileState(): InitialProfileState {
  const cached = readProfileCache();
  if (!cached) {
    return {
      profile: DEFAULT_USER_PROFILE,
      avatarUrl: undefined,
      itemCount: 0,
      hasCache: false,
    };
  }

  return {
    profile: cached.profile,
    avatarUrl: getAvatarDisplayUrl(cached.profile.avatarFileId),
    itemCount: cached.itemCount,
    hasCache: true,
  };
}

async function fetchAndCacheProfile(): Promise<ProfileCacheEntry | null> {
  const existing = readProfileCache();

  try {
    const [profile, itemCount] = await Promise.all([
      fetchUserProfile(),
      fetchWardrobeItemCount(),
    ]);

    if (profile.avatarFileId) {
      await resolveAndCacheAvatar(profile.avatarFileId);
    }

    const entry: ProfileCacheEntry = {
      profile,
      itemCount,
      cachedAt: Date.now(),
    };
    writeProfileCache(entry);
    return entry;
  } catch {
    return existing;
  }
}

export function prefetchUserProfile(): Promise<ProfileCacheEntry | null> {
  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = fetchAndCacheProfile().finally(() => {
    inflightPromise = null;
  });

  return inflightPromise;
}
