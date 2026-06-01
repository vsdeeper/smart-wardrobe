import { View, Text } from "@tarojs/components";
import { NavBar, Avatar } from "@nutui/nutui-react-taro";
import "./index.scss";

const AVATAR_SRC =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBmCTpivEznOkTWFXT6ny24Bt4QwsEslThRHoTF3RkrALjTbgZzGbpc3V4flHjljeuTvq5i5QxaIPMlmb0G9_TPT9f2I7BnbDvqnKqxOPoIHy0OAz3Ls3GXUEr6WhvsA0UxKDzFSA29uUCV7Zma7f3z96lapYURF8Kezt-f2_g0aGCyv9IB-K3kT6fSorQ0xb9YZahQP04u65Zl6HSNso_PXGEickO2pOsnanBzx2QAS6lqBmwXC5c7OAnvagtGtCxfrLx7u2V3HQe-";

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
            src={AVATAR_SRC}
          />
          <Text className="navbar-brand__title">Botanica</Text>
        </View>
      }
    />
  );
}

export default AppNavbar;
