import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { NavBar } from "@nutui/nutui-react-taro";
import DefaultAvatar from "@/components/DefaultAvatar";

import "./index.scss";

const PROFILE_ROUTE = "pages/profile/index";

function AppNavbar() {
  const handleBrandClick = () => {
    const pages = Taro.getCurrentPages();
    const currentRoute = pages[pages.length - 1]?.route;
    if (currentRoute === PROFILE_ROUTE) return;

    Taro.redirectTo({ url: "/pages/profile/index" });
  };

  return (
    <NavBar
      safeAreaInsetTop
      className="app-navbar"
      left={
        <View className="navbar-brand" onClick={handleBrandClick}>
          <DefaultAvatar size="sm" />

          <Text className="navbar-brand__title">Botanica</Text>
        </View>
      }
    />
  );
}

export default AppNavbar;
