import { View, Text } from "@tarojs/components";
import AppNavbar from "@/components/AppNavbar";
import OutfitCard from "@/components/OutfitCard";
import OutfitHero from "@/components/OutfitHero";
import OutfitMeta from "@/components/OutfitMeta";
import OutfitPieceList from "@/components/OutfitPieceList";
import PageLoading from "@/components/PageLoading";
import {
  buildWeatherCardView,
  formatLocationLabel,
  type WeatherSnapshot,
} from "@/data/weather";
import { useVisualDiaryDetail } from "@/hooks/useVisualDiaryDetail";
import Main from "@/layouts/Main";
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
  const { entry, pieces, loading, error, handlePieceClick } =
    useVisualDiaryDetail();

  const styleTags = (entry?.tips ?? [])
    .map((tip) => tip.label)
    .filter(Boolean)
    .join(" / ");

  return (
    <Main
      showTabbar={false}
      header={<AppNavbar showBack title="穿搭详情" />}
    >
      <Main.Scroll>
        {loading && <PageLoading />}

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
      </Main.Scroll>
    </Main>
  );
}

export default VisualDiaryDetailPage;
