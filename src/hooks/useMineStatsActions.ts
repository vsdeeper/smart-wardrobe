import { useCallback } from "react";
import Taro from "@tarojs/taro";
import { openProfileFieldEdit } from "@/utils/openProfileFieldEdit";

const STAT_TAB_ROUTES: Record<string, string> = {
  items: "/pages/wardrobe/index",
};

const STAT_PAGE_ROUTES: Record<string, string> = {
  outfits: "/pages/visual-diary/index",
};

export function useMineStatsActions() {
  const handleStatClick = useCallback((key: string) => {
    if (key === "height" || key === "weight") {
      openProfileFieldEdit(key);
      return;
    }

    const tabRoute = STAT_TAB_ROUTES[key];
    if (tabRoute) {
      Taro.redirectTo({ url: tabRoute });
      return;
    }

    const pageRoute = STAT_PAGE_ROUTES[key];
    if (pageRoute) {
      Taro.navigateTo({ url: pageRoute });
    }
  }, []);

  return {
    handleStatClick,
  };
}
