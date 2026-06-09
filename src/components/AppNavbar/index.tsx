import { View, Text } from "@tarojs/components";
import { NavBar, Avatar } from "@nutui/nutui-react-taro";
import { MOCK_AVATAR_SRC } from "@/data/mock/constants";
import "./index.scss";

function AppNavbar() {
  return (
    <NavBar
      safeAreaInsetTop
      className="app-navbar"
      left={
        <View className="navbar-brand">
          <Avatar
            size="small"
            className="navbar-brand__avatar"
            src={MOCK_AVATAR_SRC}
          />
          <Text className="navbar-brand__title">Botanica</Text>
        </View>
      }
    />
  );
}

export default AppNavbar;
