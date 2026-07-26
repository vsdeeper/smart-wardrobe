import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Loading, NavBar } from "@nutui/nutui-react-taro";
import OutfitCard from "@/components/OutfitCard";
import OutfitHero from "@/components/OutfitHero";
import OutfitMeta from "@/components/OutfitMeta";
import OutfitPieceList from "@/components/OutfitPieceList";
import {
  buildWeatherCardView,
  formatLocationLabel,
  type WeatherSnapshot,
} from "@/data/weather";
import { useVisualDiaryDetail } from "@/hooks/useVisualDiaryDetail";
import { formatDateTime } from "@/utils/formatDateTime";
import "./index.scss";

function buildDiarySubtitle(
  createdAt: number,
  weatherSnapshot: WeatherSnapshot | undefined,
): string {
  const date = formatDateTime(createdAt);
  if (!weatherSnapshot) return date;

  const weather = buildWeatherCardView(weatherSnapshot);
  const location = formatLocationLabel(
    weatherSnapshot.city,
    weatherSnapshot.district,
  );
  return `${date} · ${location} · ${weather.temperature}°C ${weather.conditionLabel}`;
}

function VisualDiaryDetailPage() {
  const { entry, pieces, loading, error, handleBack, handlePieceClick } =
    useVisualDiaryDetail();

  const { statusBarHeight, safeArea } = Taro.getWindowInfo();
  const safeAreaBottom = safeArea
    ? Taro.getWindowInfo().screenHeight - safeArea.bottom
    : 0;

  const styleTags = (entry?.tips ?? [])
    .map((tip) => tip.label)
    .filter(Boolean)
    .join(" / ");

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
          <OutfitCard
            hero={
              <OutfitHero
                heroImageUrl={entry.coverUrl}
                heroCoverFileId={entry.coverFileId}
              />
            }
          >
            <OutfitMeta
              title={entry.title}
              styleTags={styleTags}
              subtitle={buildDiarySubtitle(
                entry.createdAt,
                entry.weatherSnapshot,
              )}
              suggestion={entry.description}
            />
            <OutfitPieceList
              pieces={pieces}
              onPieceClick={handlePieceClick}
            />
          </OutfitCard>
        )}
      </ScrollView>
    </View>
  );
}

export default VisualDiaryDetailPage;
