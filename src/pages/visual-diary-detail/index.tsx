import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Loading, NavBar } from "@nutui/nutui-react-taro";
import { useVisualDiaryDetail } from "@/hooks/useVisualDiaryDetail";
import DiaryDetailHero from "./components/DiaryDetailHero";
import DiaryDetailMeta from "./components/DiaryDetailMeta";
import DiaryDetailPieces from "./components/DiaryDetailPieces";
import "./index.scss";

function VisualDiaryDetailPage() {
  const { entry, pieces, loading, error, handleBack, handlePieceClick } =
    useVisualDiaryDetail();

  const { statusBarHeight, safeArea } = Taro.getWindowInfo();
  const safeAreaBottom = safeArea
    ? Taro.getWindowInfo().screenHeight - safeArea.bottom
    : 0;

  return (
    <View
      className="visual-diary-detail-page"
      style={{
        ["--sw-status-bar-height" as string]: `${statusBarHeight ?? 0}px`,
        ["--sw-safe-area-bottom" as string]: `${safeAreaBottom}px`,
      }}
    >
      <NavBar
        safeAreaInsetTop
        className="visual-diary-detail-page__navbar"
        back={<Text className="visual-diary-detail-page__back">返回</Text>}
        onBackClick={handleBack}
      >
        <Text className="visual-diary-detail-page__title">穿搭详情</Text>
      </NavBar>

      <ScrollView
        className="visual-diary-detail-page__scroll"
        scrollY
        enhanced
        showScrollbar={false}
      >
        {loading && (
          <View className="visual-diary-detail-page__state">
            <Loading type="circular" />
          </View>
        )}

        {!loading && error && (
          <View className="visual-diary-detail-page__state">
            <Text className="visual-diary-detail-page__state-text">{error}</Text>
          </View>
        )}

        {!loading && entry && (
          <View className="visual-diary-detail-page__content">
            <DiaryDetailHero entry={entry} />
            <DiaryDetailMeta entry={entry} />
            <DiaryDetailPieces pieces={pieces} onPieceClick={handlePieceClick} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default VisualDiaryDetailPage;
