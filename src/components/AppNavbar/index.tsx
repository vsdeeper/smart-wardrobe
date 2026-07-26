import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { NavBar } from "@nutui/nutui-react-taro";
import DefaultAvatar from "@/components/DefaultAvatar";
import { getUserDisplayName } from "@/data/profile";
import { useUserProfile } from "@/hooks/useUserProfile";

import "./index.scss";

const MINE_PROFILE_ROUTE = "pages/mine-profile/index";
const NAVBAR_CONTENT_HEIGHT = 44;

function AppNavbar() {
  const { profile, avatarUrl, onAvatarLoadError } = useUserProfile();
  const { statusBarHeight = 0 } = Taro.getWindowInfo();
  const barHeight = statusBarHeight + NAVBAR_CONTENT_HEIGHT;

  const handleBrandClick = () => {
    const pages = Taro.getCurrentPages();
    const currentRoute = pages[pages.length - 1]?.route;
    if (currentRoute === MINE_PROFILE_ROUTE) return;

    Taro.navigateTo({ url: "/pages/mine-profile/index" });
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
      left={
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
      }
    />
  );
}

export default AppNavbar;
