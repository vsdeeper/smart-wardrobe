import { View, Text } from "@tarojs/components";
import { Image, Loading } from "@nutui/nutui-react-taro";
import type { TryOnPreviewStatus } from "@/data/tryOn";
import type { WeatherCardViewModel } from "@/data/weather";
import type { WeatherLoadStatus } from "@/services/weather";

export interface OutfitHeroProps {
  heroImageUrl: string | null;
  heroCoverFileId: string | null;
  previewStatus: TryOnPreviewStatus;
  previewErrorMessage?: string | null;
  onRetryPreview?: () => void;
  weatherStatus: WeatherLoadStatus;
  weatherViewModel: WeatherCardViewModel | null;
  onWeatherClick: () => void;
}

function WeatherChip({
  status,
  viewModel,
  onClick,
}: {
  status: WeatherLoadStatus;
  viewModel: WeatherCardViewModel | null;
  onClick: () => void;
}) {
  const isSuccess = status === "success" && viewModel;

  return (
    <View
      className="weather-chip"
      hoverClass="weather-chip--pressed"
      hoverStartTime={0}
      hoverStayTime={100}
      onClick={onClick}
    >
      {status === "loading" || status === "idle" ? (
        <Text className="weather-chip__text">获取中…</Text>
      ) : status === "location_denied" ? (
        <Text className="weather-chip__text">开启定位</Text>
      ) : isSuccess ? (
        <>
          <Text
            className={`iconfont ${viewModel.icon} weather-chip__icon`}
          />
          <Text className="weather-chip__temp">{viewModel.temperature}°C</Text>
          <Text className="weather-chip__label">{viewModel.conditionLabel}</Text>
        </>
      ) : (
        <Text className="weather-chip__text">点击重试</Text>
      )}
    </View>
  );
}

export default function OutfitHero({
  heroImageUrl,
  heroCoverFileId,
  previewStatus,
  previewErrorMessage,
  onRetryPreview,
  weatherStatus,
  weatherViewModel,
  onWeatherClick,
}: OutfitHeroProps) {
  const isLoading = previewStatus === "loading";
  const isError = previewStatus === "error";
  const heroSrc = heroImageUrl || heroCoverFileId;

  return (
    <View className="outfit-hero">
      {heroSrc ? (
        <Image className="outfit-hero__image" src={heroSrc} mode="aspectFill" />
      ) : null}
      {isLoading && (
        <View className="outfit-hero__loading">
          <Loading type="circular" />
        </View>
      )}
      {isError && (
        <View className="outfit-hero__error">
          <Text className="outfit-hero__error-title">试穿图生成失败</Text>
          <Text className="outfit-hero__error-desc">
            {previewErrorMessage || "请稍后重试"}
          </Text>
          {onRetryPreview ? (
            <View
              className="outfit-hero__error-retry"
              onClick={onRetryPreview}
            >
              <Text className="outfit-hero__error-retry-text">重试</Text>
            </View>
          ) : null}
        </View>
      )}
      <WeatherChip
        status={weatherStatus}
        viewModel={weatherViewModel}
        onClick={onWeatherClick}
      />
    </View>
  );
}
