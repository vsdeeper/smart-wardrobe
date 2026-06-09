import Taro from "@tarojs/taro";

/**
 * 底部 Tab 与页面路由映射（key 见 Main BOTTOM_TABS，顺序与 index 一致）：
 * | index | key      | route                    | 标签 |
 * |-------|----------|--------------------------|------|
 * | 0     | wardrobe | /pages/wardrobe/index    | 衣橱 |
 * | 1     | try-on   | /pages/try-on/index     | 试穿 |
 * | 2     | outfit   | /pages/outfit/index      | 搭配 |
 * | 3     | profile  | /pages/profile/index     | 我的 |
 */
const TAB_ROUTES: (string | null)[] = [
  "/pages/wardrobe/index",
  "/pages/try-on/index",
  "/pages/outfit/index",
  "/pages/profile/index",
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
