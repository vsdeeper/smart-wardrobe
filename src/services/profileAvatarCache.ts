import Taro from "@tarojs/taro";

export interface AvatarCacheEntry {
  fileId: string;
  url: string;
  cachedAt: number;
}

const CACHE_KEY = "sw_profile_avatar_cache";
const CACHE_TTL_MS = 30 * 60 * 1000;

let memoryCache: AvatarCacheEntry | null | undefined;

function isValidEntry(raw: unknown): raw is AvatarCacheEntry {
  return (
    !!raw &&
    typeof raw === "object" &&
    typeof (raw as AvatarCacheEntry).fileId === "string" &&
    typeof (raw as AvatarCacheEntry).url === "string" &&
    typeof (raw as AvatarCacheEntry).cachedAt === "number"
  );
}

export function isAvatarCacheValid(
  entry: AvatarCacheEntry,
  fileId?: string,
): boolean {
  if (fileId && entry.fileId !== fileId) {
    return false;
  }
  return Date.now() - entry.cachedAt < CACHE_TTL_MS;
}

export function readAvatarCache(): AvatarCacheEntry | null {
  if (memoryCache !== undefined) {
    return memoryCache;
  }

  try {
    const raw = Taro.getStorageSync(CACHE_KEY) as AvatarCacheEntry | "";
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

export function writeAvatarCache(fileId: string, url: string): void {
  const entry: AvatarCacheEntry = {
    fileId,
    url,
    cachedAt: Date.now(),
  };
  memoryCache = entry;
  try {
    Taro.setStorageSync(CACHE_KEY, entry);
  } catch {
    // ignore
  }
}

export function clearAvatarCache(): void {
  memoryCache = null;
  try {
    Taro.removeStorageSync(CACHE_KEY);
  } catch {
    // ignore
  }
}

export function getCachedAvatarUrl(fileId?: string): string | undefined {
  const entry = readAvatarCache();
  if (!entry) return undefined;
  if (fileId && entry.fileId !== fileId) return undefined;
  return entry.url;
}
