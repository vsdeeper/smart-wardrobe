import { useCallback, useRef, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { DEFAULT_USER_PROFILE, type UserProfile } from "@/data/profile";
import { fetchUserProfile, saveUserProfile } from "@/services/profile";
import { resolveAvatarUrl } from "@/services/profileAvatar";
import { fetchWardrobeItemCount } from "@/services/wardrobe";

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
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
        const url = await resolveAvatarUrl(userProfile.avatarFileId);
        setAvatarUrl(url ?? undefined);
      } else {
        setAvatarUrl(undefined);
      }
    } catch {
      setProfile(DEFAULT_USER_PROFILE);
      setAvatarUrl(undefined);
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
        const url = await resolveAvatarUrl(saved.avatarFileId);
        setAvatarUrl(url ?? undefined);
      } else if (patch.avatarFileId === undefined && !saved.avatarFileId) {
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
