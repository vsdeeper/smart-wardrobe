import Taro from "@tarojs/taro";
import { DEFAULT_USER_PROFILE, type UserProfile } from "@/data/profile";
import { fetchUserProfile } from "@/services/profile";
import { resolveAvatarUrl } from "@/services/profileAvatar";
import { fetchWardrobeItemCount } from "@/services/wardrobe";

export interface ProfileCacheEntry {
  profile: UserProfile;
  avatarUrl?: string;
  itemCount: number;
  cachedAt: number;
}

export interface InitialProfileState {
  profile: UserProfile;
  avatarUrl?: string;
  itemCount: number;
  hasCache: boolean;
}

const CACHE_KEY = "sw_user_profile_cache";
const AVATAR_URL_TTL_MS = 30 * 60 * 1000;

let memoryCache: ProfileCacheEntry | null | undefined;
let inflightPromise: Promise<ProfileCacheEntry | null> | null = null;

function isValidProfile(raw: unknown): raw is UserProfile {
  if (!raw || typeof raw !== "object") return false;
  const profile = raw as UserProfile;
  return (
    typeof profile.heightCm === "number" &&
    typeof profile.weightKg === "number" &&
    typeof profile.occupation === "string" &&
    Array.isArray(profile.styleTags)
  );
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

function isAvatarUrlCacheValid(
  entry: ProfileCacheEntry,
  fileId: string,
): boolean {
  if (entry.profile.avatarFileId !== fileId || !entry.avatarUrl) {
    return false;
  }
  return Date.now() - entry.cachedAt < AVATAR_URL_TTL_MS;
}

async function resolveAvatarUrlWithCache(
  fileId: string,
  cached: ProfileCacheEntry | null,
  forceRefresh = false,
): Promise<string | undefined> {
  if (!forceRefresh && cached && isAvatarUrlCacheValid(cached, fileId)) {
    return cached.avatarUrl;
  }

  const url = await resolveAvatarUrl(fileId);
  return url ?? undefined;
}

export function invalidateAvatarUrl(): void {
  const cached = readProfileCache();
  if (!cached) return;

  writeProfileCache({
    ...cached,
    avatarUrl: undefined,
    cachedAt: Date.now(),
  });
}

export async function refreshAvatarUrl(): Promise<string | undefined> {
  const cached = readProfileCache();
  const fileId = cached?.profile.avatarFileId;
  if (!fileId) return undefined;

  const avatarUrl = await resolveAvatarUrlWithCache(fileId, cached, true);
  if (!cached) return avatarUrl;

  writeProfileCache({
    ...cached,
    avatarUrl,
    cachedAt: Date.now(),
  });
  return avatarUrl;
}

export function readProfileCache(): ProfileCacheEntry | null {
  if (memoryCache !== undefined) {
    return memoryCache;
  }

  try {
    const raw = Taro.getStorageSync(CACHE_KEY) as ProfileCacheEntry | "";
    if (!isValidEntry(raw)) {
      memoryCache = null;
      return null;
    }
    memoryCache = raw;
    return raw;
  } catch {
    memoryCache = null;
    return null;
  }
}

export function writeProfileCache(entry: ProfileCacheEntry): void {
  memoryCache = entry;
  try {
    Taro.setStorageSync(CACHE_KEY, entry);
  } catch {
    // ignore
  }
}

export function clearProfileCache(): void {
  memoryCache = null;
  try {
    Taro.removeStorageSync(CACHE_KEY);
  } catch {
    // ignore
  }
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
    avatarUrl: cached.avatarUrl,
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

    let avatarUrl: string | undefined;
    if (profile.avatarFileId) {
      avatarUrl = await resolveAvatarUrlWithCache(
        profile.avatarFileId,
        existing,
      );
    }

    const entry: ProfileCacheEntry = {
      profile,
      avatarUrl,
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
