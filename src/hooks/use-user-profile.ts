import { DEFAULT_USER_PROFILE } from "@/constants/profile";
import { type UserProfile } from "@/types/profile";
import { isGenderSet } from "@/utils/profile";
import { useCallback, useRef, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";


import { saveUserProfile, removeUserProfileFields } from "@/services/profile";
import { resolveAvatarUrl } from "@/services/profile-avatar";
import { clearTryOnCache } from "@/services/try-on-cache";
import { putImageUrlCache } from "@/services/image-url-cache";
import {
  clearProfileCache,
  getAvatarDisplayUrl,
  getInitialProfileState,
  invalidateAvatarUrl,
  prefetchUserProfile,
  readProfileCache,
  refreshAvatarUrl,
  writeProfileCache,
} from "@/services/profile-cache";
import { isActiveTryOnModelCompatibleWithGender } from "@/utils/try-on-model";

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
      setAvatarUrl(getAvatarDisplayUrl(entry.profile.avatarFileId));
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
      let next = { ...profileRef.current, ...patch };

      if (
        patch.gender !== undefined &&
        isGenderSet(patch.gender) &&
        next.activeTryOnModel &&
        !isActiveTryOnModelCompatibleWithGender(
          next.activeTryOnModel,
          patch.gender,
        )
      ) {
        next = { ...next, activeTryOnModel: undefined };
      }

      let saved = await saveUserProfile(next);

      if (
        next.activeTryOnModel === undefined &&
        profileRef.current.activeTryOnModel &&
        saved._id
      ) {
        await removeUserProfileFields(saved._id, ["activeTryOnModel"]);
        saved = { ...saved, activeTryOnModel: undefined };
      }

      setProfile(saved);

      let nextAvatarUrl: string | undefined;
      if (saved.avatarFileId) {
        if (patch.avatarFileId !== undefined) {
          const resolved =
            (await resolveAvatarUrl(saved.avatarFileId)) ?? undefined;
          if (resolved) {
            putImageUrlCache("avatar", saved.avatarFileId, resolved);
          }
          nextAvatarUrl = resolved;
        } else {
          nextAvatarUrl =
            getAvatarDisplayUrl(saved.avatarFileId) ?? avatarUrlRef.current;
        }
        setAvatarUrl(nextAvatarUrl);
      } else {
        nextAvatarUrl = undefined;
        setAvatarUrl(undefined);
      }

      writeProfileCache({
        profile: saved,
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
    void refresh();
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
