import { useCallback, useState } from "react";
import { useDidShow } from "@tarojs/taro";
import { DEFAULT_USER_PROFILE, type UserProfile } from "@/data/profile";
import { fetchUserProfile } from "@/services/profile";
import { fetchWardrobeItemCount } from "@/services/wardrobe";

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [userProfile, count] = await Promise.all([
        fetchUserProfile(),
        fetchWardrobeItemCount(),
      ]);
      setProfile(userProfile);
      setItemCount(count);
    } catch {
      setProfile(DEFAULT_USER_PROFILE);
    } finally {
      setLoading(false);
    }
  }, []);

  useDidShow(() => {
    refresh();
  });

  return { profile, itemCount, loading, refresh };
}
