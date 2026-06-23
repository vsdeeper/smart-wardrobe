import { useCallback, useRef, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { DEFAULT_USER_PROFILE, type UserProfile } from "@/data/profile";
import { isGenderSet } from "@/data/profile";
import { saveUserProfile } from "@/services/profile";
import { resolveAvatarUrl } from "@/services/profileAvatar";
import { clearTryOnCache } from "@/services/tryOnCache";
import {
  clearProfileCache,
  getInitialProfileState,
  invalidateAvatarUrl,
  prefetchUserProfile,
  readProfileCache,
  refreshAvatarUrl,
  writeProfileCache,
} from "@/services/profileCache";

export function useUserProfile() {
  const initial = getInitialProfileState();
  const [profile, setProfile] = useState<UserProfile>(initial.profile);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    initial.avatarUrl,
  );
  const [itemCount, setItemCount] = useState(initial.itemCount);
  const [loading, setLoading] = useState(!initial.hasCache);
  const [updating, setUpdating] = useState(false);
  const profileRef = useRef(profile);
  const itemCountRef = useRef(itemCount);
  const avatarUrlRef = useRef(avatarUrl);

  profileRef.current = profile;
  itemCountRef.current = itemCount;
  avatarUrlRef.current = avatarUrl;

  const applyCacheEntry = useCallback(
    (entry: NonNullable<Awaited<ReturnType<typeof prefetchUserProfile>>>) => {
      setProfile(entry.profile);
      setItemCount(entry.itemCount);
      setAvatarUrl(entry.avatarUrl);
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!readProfileCache()) {
      setLoading(true);
    }

    try {
      const entry = await prefetchUserProfile();
      if (entry) {
        applyCacheEntry(entry);
      } else {
        clearProfileCache();
        setProfile(DEFAULT_USER_PROFILE);
        setItemCount(0);
        setAvatarUrl(undefined);
      }
    } catch {
      if (!readProfileCache()) {
        setProfile(DEFAULT_USER_PROFILE);
        setAvatarUrl(undefined);
        setItemCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, [applyCacheEntry]);

  const handleAvatarLoadError = useCallback(async () => {
    invalidateAvatarUrl();
    const url = await refreshAvatarUrl();
    if (url) {
      setAvatarUrl(url);
    }
  }, []);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    setUpdating(true);
    try {
      const next = { ...profileRef.current, ...patch };
      const saved = await saveUserProfile(next);
      setProfile(saved);

      let nextAvatarUrl: string | undefined;
      if (saved.avatarFileId) {
        if (patch.avatarFileId !== undefined) {
          nextAvatarUrl = (await resolveAvatarUrl(saved.avatarFileId)) ?? undefined;
        } else {
          nextAvatarUrl = avatarUrlRef.current;
        }
        setAvatarUrl(nextAvatarUrl);
      } else {
        nextAvatarUrl = undefined;
        setAvatarUrl(undefined);
      }

      writeProfileCache({
        profile: saved,
        avatarUrl: nextAvatarUrl,
        itemCount: itemCountRef.current,
        cachedAt: Date.now(),
      });

      if (patch.gender !== undefined && isGenderSet(patch.gender)) {
        clearTryOnCache();
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
    onAvatarLoadError: handleAvatarLoadError,
  };
}
