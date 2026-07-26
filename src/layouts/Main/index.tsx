import { useState, Children, isValidElement } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Tabbar } from "@nutui/nutui-react-taro";
import "./index.scss";

/** 底部导航 — 对齐设计稿 */
const BOTTOM_TABS = [
  { key: "wardrobe", label: "衣橱", iconClass: "icon-wardrobe" },
  { key: "try-on", label: "试穿", iconClass: "icon-try-on" },
  { key: "outfit", label: "搭配", iconClass: "icon-outfit" },
  { key: "mine", label: "我的", iconClass: "icon-mine" },
] as const;

export interface MainScrollProps {
  children: React.ReactNode;
  onScrollToLower?: () => void;
  lowerThreshold?: number;
}

function MainScroll(_props: MainScrollProps) {
  return null;
}

export interface MainProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  activeTab?: number;
  onTabChange?: (index: number) => void;
  scrollClassName?: string;
  /** 二级页传 false，隐藏底部 Tabbar */
  showTabbar?: boolean;
}

function Main({
  children,
  header,
  activeTab: activeTabProp,
  onTabChange,
  scrollClassName,
  showTabbar = true,
}: MainProps) {
  const [internalTab, setInternalTab] = useState(0);
  const isControlled = activeTabProp !== undefined;
  const activeTab = isControlled ? activeTabProp : internalTab;

  const childArray = Children.toArray(children);
  const scrollElement = childArray.find(
    (child) => isValidElement(child) && child.type === MainScroll
  );
  const overlayChildren = childArray.filter(
    (child) => !(isValidElement(child) && child.type === MainScroll)
  );
  const scrollProps =
    isValidElement(scrollElement) && scrollElement.props
      ? (scrollElement.props as MainScrollProps)
      : null;
  const scrollContent = scrollProps?.children ?? children;

  const handleSwitch = (value: string | number) => {
    const index = value as number;
    if (!isControlled) {
      setInternalTab(index);
    }
    onTabChange?.(index);
  };

  const scrollClass = [
    "main-scroll",
    !showTabbar && "main-scroll--no-tabbar",
    scrollClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const { statusBarHeight, screenHeight, safeArea } = Taro.getWindowInfo();
  const safeAreaBottom = safeArea ? screenHeight - safeArea.bottom : 0;

  return (
    <View
      className="main-page"
      style={{
        ["--sw-status-bar-height" as string]: `${statusBarHeight ?? 0}px`,
        ["--sw-safe-area-bottom" as string]: `${safeAreaBottom}px`,
        ["--sw-tabbar-offset" as string]: showTabbar ? "56px" : "0px",
      }}
    >
      {header}
      <View className="main-layout">
        <ScrollView
          id="main-scroll"
          className={scrollClass}
          scrollY
          enhanced
          showScrollbar={false}
          scrollWithAnimation
          lowerThreshold={scrollProps?.lowerThreshold ?? 100}
          onScrollToLower={scrollProps?.onScrollToLower}
        >
          {scrollContent}
        </ScrollView>
        {showTabbar ? (
          <Tabbar
            fixed
            safeArea
            value={activeTab}
            activeColor="var(--nutui-brand-6)"
            inactiveColor="var(--nutui-gray-5)"
            className="main-tabbar"
            onSwitch={handleSwitch}
          >
            {BOTTOM_TABS.map((tab) => (
              <Tabbar.Item
                key={tab.key}
                title={tab.label}
                icon={
                  <View className="main-tabbar-icon">
                    <Text className={`iconfont ${tab.iconClass}`} />
                  </View>
                }
              />
            ))}
          </Tabbar>
        ) : null}
      </View>
      {overlayChildren}
    </View>
  );
}

Main.Scroll = MainScroll;

export default Main;
