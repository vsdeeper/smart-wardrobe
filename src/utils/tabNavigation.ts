import Taro from "@tarojs/taro";

/** 底部 Tab 对应页面路径，未实现则为 null */
const TAB_ROUTES: (string | null)[] = [
  "/pages/wardrobe/index",
  "/pages/try-on/index",
  null,
  null,
];

export function useMainTabNavigation(currentTab: number) {
  const handleTabChange = (index: number) => {
    if (index === currentTab) return;

    const route = TAB_ROUTES[index];
    if (route) {
      Taro.redirectTo({ url: route });
      return;
    }

    Taro.showToast({ title: "即将上线", icon: "none" });
  };

  return { activeTab: currentTab, onTabChange: handleTabChange };
}
