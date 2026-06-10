import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Loading, NavBar } from "@nutui/nutui-react-taro";
import { useWardrobeDetail } from "@/hooks/useWardrobeDetail";
import WardrobeDetailHero from "@/components/WardrobeDetailHero";
import WardrobeDetailInfo from "./components/WardrobeDetailInfo";
import "./index.scss";

function WardrobeDetailPage() {
  const { item, loading, error, handleBack } = useWardrobeDetail();

  const { statusBarHeight, safeArea } = Taro.getWindowInfo();
  const safeAreaBottom = safeArea
    ? Taro.getWindowInfo().screenHeight - safeArea.bottom
    : 0;

  return (
    <View
      className="wardrobe-detail-page"
      style={{
        ["--sw-status-bar-height" as string]: `${statusBarHeight ?? 0}px`,
        ["--sw-safe-area-bottom" as string]: `${safeAreaBottom}px`,
      }}
    >
      <NavBar
        safeAreaInsetTop
        className="wardrobe-detail-page__navbar"
        back={<Text className="wardrobe-detail-page__back">返回</Text>}
        onBackClick={handleBack}
      >
        <Text className="wardrobe-detail-page__title">衣物详情</Text>
      </NavBar>

      <ScrollView
        className="wardrobe-detail-page__scroll"
        scrollY
        enhanced
        showScrollbar={false}
      >
        {loading && (
          <View className="wardrobe-detail-page__state">
            <Loading type="circular" />
          </View>
        )}

        {!loading && error && (
          <View className="wardrobe-detail-page__state">
            <Text className="wardrobe-detail-page__state-text">{error}</Text>
          </View>
        )}

        {!loading && item && (
          <View className="wardrobe-detail-page__content">
            <WardrobeDetailHero item={item} />
            <WardrobeDetailInfo item={item} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default WardrobeDetailPage;
