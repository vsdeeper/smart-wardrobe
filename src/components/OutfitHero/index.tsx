import { WeatherCardViewModel } from "@/types/weather";
import { TryOnPreviewStatus } from "@/types/try-on";
import { View, Text } from "@tarojs/components";
import { Image } from "@nutui/nutui-react-taro";
import OverlayLoading from "@/components/OverlayLoading";


import type { WeatherLoadStatus } from "@/services/weather";
import "./index.scss";

export interface OutfitHeroProps {
  heroImageUrl?: string | null;
  heroCoverFileId?: string | null;
  previewStatus?: TryOnPreviewStatus;
  previewErrorMessage?: string | null;
  onRetryPreview?: () => void;
  onImageError?: () => void;
  /** 兼容旧用法：与 weatherViewModel 二选一 */
  weatherStatus?: WeatherLoadStatus;
  weatherViewModel?: WeatherCardViewModel | null;
  onWeatherClick?: () => void;
}

function StaticWeatherChip({
  viewModel,
  onClick,
}: {
  viewModel: WeatherCardViewModel;
  onClick?: () => void;
}) {
  return (
    <View
      className="weather-chip"
      hoverClass={onClick ? "weather-chip--pressed" : undefined}
      hoverStartTime={0}
      hoverStayTime={100}
      onClick={onClick}
    >
      <Text className={`iconfont ${viewModel.icon} weather-chip__icon`} />
      <Text className="weather-chip__temp">{viewModel.temperature}°C</Text>
      <Text className="weather-chip__label">{viewModel.conditionLabel}</Text>
    </View>
  );
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
          <Text className={`iconfont ${viewModel.icon} weather-chip__icon`} />
          <Text className="weather-chip__temp">{viewModel.temperature}°C</Text>
          <Text className="weather-chip__label">
            {viewModel.conditionLabel}
          </Text>
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
  onImageError,
  weatherStatus,
  weatherViewModel,
  onWeatherClick,
}: OutfitHeroProps) {
  const isLoading = previewStatus === "loading";
  const isError = previewStatus === "error";
  const heroSrc = !isLoading && (heroImageUrl || heroCoverFileId);
  const showLegacyWeatherChip =
    weatherStatus !== undefined && typeof onWeatherClick === "function";
  const showStaticWeatherChip =
    !showLegacyWeatherChip && weatherViewModel != null;

  return (
    <View className="outfit-hero">
      {heroSrc ? (
        <Image
          className="outfit-hero__image"
          src={heroSrc}
          mode="aspectFill"
          onError={onImageError}
        />
      ) : null}
      {isLoading ? <OverlayLoading text="AI 试穿中..." /> : null}
      {isError && (
        <View className="outfit-hero__error">
          <Text className="outfit-hero__error-title">试穿图没能生成</Text>
          <Text className="outfit-hero__error-desc">
            {previewErrorMessage || "请稍后再试一次"}
          </Text>
          {onRetryPreview ? (
            <View className="outfit-hero__error-retry" onClick={onRetryPreview}>
              <Text className="outfit-hero__error-retry-text">重试</Text>
            </View>
          ) : null}
        </View>
      )}
      {showLegacyWeatherChip ? (
        <WeatherChip
          status={weatherStatus!}
          viewModel={weatherViewModel ?? null}
          onClick={onWeatherClick!}
        />
      ) : null}
      {showStaticWeatherChip ? (
        <StaticWeatherChip
          viewModel={weatherViewModel!}
          onClick={onWeatherClick}
        />
      ) : null}
    </View>
  );
}
