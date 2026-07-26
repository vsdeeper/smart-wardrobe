import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { NavBar } from "@nutui/nutui-react-taro";
import DefaultAvatar from "@/components/DefaultAvatar";
import { getUserDisplayName } from "@/data/profile";
import { useUserProfile } from "@/hooks/useUserProfile";

import "./index.scss";

const MINE_PROFILE_ROUTE = "pages/mine-profile/index";
const NAVBAR_CONTENT_HEIGHT = 44;

export interface AppNavbarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

function AppNavbar({ title, showBack = false, onBack }: AppNavbarProps) {
  const { profile, avatarUrl, onAvatarLoadError } = useUserProfile();
  const { statusBarHeight = 0 } = Taro.getWindowInfo();
  const barHeight = statusBarHeight + NAVBAR_CONTENT_HEIGHT;

  const handleBrandClick = () => {
    const pages = Taro.getCurrentPages();
    const currentRoute = pages[pages.length - 1]?.route;
    if (currentRoute === MINE_PROFILE_ROUTE) return;

    Taro.navigateTo({ url: "/pages/mine-profile/index" });
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
      return;
    }
    Taro.navigateBack();
  };

  return (
    <NavBar
      fixed
      zIndex={100}
      className="app-navbar"
      style={{
        paddingTop: `${statusBarHeight}px`,
        height: `${barHeight}px`,
        boxSizing: "border-box",
        ["--sw-navbar-inset-top" as string]: `${statusBarHeight}px`,
      }}
      back={
        showBack ? <Text className="app-navbar__back">返回</Text> : undefined
      }
      onBackClick={showBack ? handleBackClick : undefined}
      left={
        showBack ? undefined : (
          <View className="navbar-brand" onClick={handleBrandClick}>
            <DefaultAvatar
              size="sm"
              src={avatarUrl}
              onLoadError={onAvatarLoadError}
            />

            <Text className="navbar-brand__title">
              {getUserDisplayName(profile)}
            </Text>
          </View>
        )
      }
    >
      {title ? <Text className="app-navbar__title">{title}</Text> : null}
    </NavBar>
  );
}

export default AppNavbar;
