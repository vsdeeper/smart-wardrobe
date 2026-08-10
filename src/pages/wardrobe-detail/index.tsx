import { View, Text } from "@tarojs/components";
import AppNavbar from "@/components/AppNavbar";
import PageLoading from "@/components/PageLoading";
import WardrobeDetailHero from "@/components/WardrobeDetailHero";
import { useWardrobeDetail } from "@/hooks/use-wardrobe-detail";
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
          {loading && <PageLoading />}

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
