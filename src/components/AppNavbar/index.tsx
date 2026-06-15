import { View, Text } from "@tarojs/components";

import { NavBar } from "@nutui/nutui-react-taro";

import "./index.scss";

function AppNavbar() {
  return (
    <NavBar
      safeAreaInsetTop
      className="app-navbar"
      left={
        <View className="navbar-brand">
          <View className="navbar-brand__avatar">
            <Text className="iconfont icon-totoro navbar-brand__avatar-icon" />
          </View>

          <Text className="navbar-brand__title">Botanica</Text>
        </View>
      }
    />
  );
}

export default AppNavbar;
