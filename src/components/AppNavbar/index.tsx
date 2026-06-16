import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { NavBar } from "@nutui/nutui-react-taro";
import DefaultAvatar from "@/components/DefaultAvatar";
import { getUserDisplayName } from "@/data/profile";
import { useUserProfile } from "@/hooks/useUserProfile";

import "./index.scss";

const MINE_PROFILE_ROUTE = "pages/mine-profile/index";

function AppNavbar() {
  const { profile, avatarUrl } = useUserProfile();
  const handleBrandClick = () => {
    const pages = Taro.getCurrentPages();
    const currentRoute = pages[pages.length - 1]?.route;
    if (currentRoute === MINE_PROFILE_ROUTE) return;

    Taro.navigateTo({ url: "/pages/mine-profile/index" });
  };

  return (
    <NavBar
      safeAreaInsetTop
      className="app-navbar"
      left={
        <View className="navbar-brand" onClick={handleBrandClick}>
          <DefaultAvatar size="sm" src={avatarUrl} />

          <Text className="navbar-brand__title">
            {getUserDisplayName(profile)}
          </Text>
        </View>
      }
    />
  );
}

export default AppNavbar;
