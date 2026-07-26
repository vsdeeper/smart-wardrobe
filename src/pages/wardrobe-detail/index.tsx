import { View, Text } from "@tarojs/components";
import { Loading } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import WardrobeDetailHero from "@/components/WardrobeDetailHero";
import { useWardrobeDetail } from "@/hooks/useWardrobeDetail";
import Main from "@/layouts/Main";
import WardrobeDetailInfo from "./components/WardrobeDetailInfo";
import "./index.scss";

function WardrobeDetailPage() {
  const { item, loading, error } = useWardrobeDetail();

  return (
    <Main
      showTabbar={false}
      header={<AppNavbar showBack title="衣物详情" />}
    >
      <Main.Scroll>
        <View className="wardrobe-detail-page">
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
        </View>
      </Main.Scroll>
    </Main>
  );
}

export default WardrobeDetailPage;
