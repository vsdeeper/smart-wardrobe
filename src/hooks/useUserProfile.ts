import { useCallback, useRef, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { DEFAULT_USER_PROFILE, type UserProfile } from "@/data/profile";
import { fetchUserProfile, saveUserProfile } from "@/services/profile";
import { resolveAvatarUrl } from "@/services/profileAvatar";
import {
  clearAvatarCache,
  isAvatarCacheValid,
  readAvatarCache,
  writeAvatarCache,
} from "@/services/profileAvatarCache";
import { fetchWardrobeItemCount } from "@/services/wardrobe";

async function resolveAndCacheAvatar(fileId: string): Promise<string | undefined> {
  const cached = readAvatarCache();
  if (cached && isAvatarCacheValid(cached, fileId)) {
    return cached.url;
  }

  const url = await resolveAvatarUrl(fileId);
  if (url) {
    writeAvatarCache(fileId, url);
    return url;
  }
  return undefined;
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    () => readAvatarCache()?.url,
  );
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const profileRef = useRef(profile);

  profileRef.current = profile;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [userProfile, count] = await Promise.all([
        fetchUserProfile(),
        fetchWardrobeItemCount(),
      ]);
      setProfile(userProfile);
      setItemCount(count);

      if (userProfile.avatarFileId) {
        const url = await resolveAndCacheAvatar(userProfile.avatarFileId);
        setAvatarUrl(url);
      } else {
        clearAvatarCache();
        setAvatarUrl(undefined);
      }
    } catch {
      setProfile(DEFAULT_USER_PROFILE);
      const cached = readAvatarCache();
      if (!cached) {
        setAvatarUrl(undefined);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    setUpdating(true);
    try {
      const next = { ...profileRef.current, ...patch };
      const saved = await saveUserProfile(next);
      setProfile(saved);

      if (saved.avatarFileId) {
        const url = await resolveAndCacheAvatar(saved.avatarFileId);
        setAvatarUrl(url);
      } else {
        clearAvatarCache();
        setAvatarUrl(undefined);
      }

      return true;
    } catch {
      Taro.showToast({ title: "保存失败，请稍后重试", icon: "none" });
      return false;
    } finally {
      setUpdating(false);
    }
  }, []);

  useDidShow(() => {
    refresh();
  });

  return {
    profile,
    avatarUrl,
    itemCount,
    loading,
    updating,
    refresh,
    updateProfile,
  };
}
