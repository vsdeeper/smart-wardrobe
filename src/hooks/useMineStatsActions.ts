import { useCallback, useState } from "react";
import Taro from "@tarojs/taro";
import type { ProfileMetric, UserProfile } from "@/data/profile";

const STAT_ROUTES: Record<string, string> = {
  items: "/pages/wardrobe/index",
  outfits: "/pages/outfit/index",
};

interface UseMineStatsActionsOptions {
  profile: UserProfile;
  updating: boolean;
  updateProfile: (patch: Partial<UserProfile>) => Promise<boolean>;
}

export function useMineStatsActions({
  profile,
  updating,
  updateProfile,
}: UseMineStatsActionsOptions) {
  const [metricDialog, setMetricDialog] = useState<ProfileMetric | null>(null);

  const handleStatClick = useCallback((key: string) => {
    if (key === "height" || key === "weight") {
      setMetricDialog(key);
      return;
    }

    const route = STAT_ROUTES[key];
    if (route) {
      Taro.redirectTo({ url: route });
    }
  }, []);

  const handleMetricClose = useCallback(() => {
    if (updating) return;
    setMetricDialog(null);
  }, [updating]);

  const handleMetricConfirm = useCallback(
    async (value: number) => {
      if (updating || !metricDialog) return;

      const patch =
        metricDialog === "height"
          ? { heightCm: value }
          : { weightKg: value };

      const ok = await updateProfile(patch);
      if (ok) {
        Taro.showToast({ title: "已保存", icon: "success" });
        setMetricDialog(null);
      }
    },
    [metricDialog, updateProfile, updating],
  );

  const metricInitialValue =
    metricDialog === "height"
      ? profile.heightCm
      : metricDialog === "weight"
        ? profile.weightKg
        : 0;

  return {
    metricDialog,
    metricDialogVisible: metricDialog !== null,
    metricInitialValue,
    handleStatClick,
    handleMetricClose,
    handleMetricConfirm,
  };
}
