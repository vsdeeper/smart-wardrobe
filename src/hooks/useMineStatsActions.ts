import { useCallback } from "react";
import Taro from "@tarojs/taro";
import { openProfileFieldEdit } from "@/utils/openProfileFieldEdit";

const STAT_ROUTES: Record<string, string> = {
  items: "/pages/wardrobe/index",
  outfits: "/pages/outfit/index",
};

export function useMineStatsActions() {
  const handleStatClick = useCallback((key: string) => {
    if (key === "height" || key === "weight") {
      openProfileFieldEdit(key);
      return;
    }

    const route = STAT_ROUTES[key];
    if (route) {
      Taro.redirectTo({ url: route });
    }
  }, []);

  return {
    handleStatClick,
  };
}
