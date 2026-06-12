import { View, Text } from "@tarojs/components";
import { Location, LogisticsError } from "@nutui/icons-react-taro";
import { Loading } from "@nutui/nutui-react-taro";
import type { WeatherCardViewModel } from "@/data/weather";
import type { WeatherLoadStatus } from "@/services/weather";

export interface WeatherCardProps {
  status: WeatherLoadStatus;
  viewModel: WeatherCardViewModel | null;
  isStale: boolean;
  onClick: () => void;
}

export default function WeatherCard({
  status,
  viewModel,
  isStale,
  onClick,
}: WeatherCardProps) {
  return (
    <View
      className={[
        "weather-card",
        status === "loading" && "weather-card--loading",
        status === "location_denied" && "weather-card--location-denied",
      ]
        .filter(Boolean)
        .join(" ")}
      hoverClass="weather-card--pressed"
      hoverStartTime={0}
      hoverStayTime={100}
      onClick={onClick}
    >
      <View className="weather-card__main">
        {status === "loading" || status === "idle" ? (
          <>
            <View className="weather-card__skeleton weather-card__skeleton--icon">
              <Loading type="circular" />
            </View>
            <View className="weather-card__info">
              <Text className="weather-card__location">获取天气中…</Text>
            </View>
          </>
        ) : status === "location_denied" ? (
          <>
            <View className="weather-card__icon weather-card__icon--location">
              <Location size={36} color="var(--nutui-secondary-1)" />
            </View>
            <View className="weather-card__info">
              <Text className="weather-card__location">
                无法获取您的位置，开启定位
              </Text>
            </View>
          </>
        ) : status === "error" ? (
          <>
            <View className="weather-card__icon weather-card__icon--error">
              <LogisticsError size={36} color="var(--nutui-color-warning)" />
            </View>
            <View className="weather-card__info">
              <Text className="weather-card__location">获取失败，点击重试</Text>
            </View>
          </>
        ) : (
          <>
            <Text
              className={`iconfont ${viewModel?.icon} weather-card__icon weather-card__icon--glyph`}
            />
            <View className="weather-card__info">
              <Text className="weather-card__location">
                {viewModel?.locationLine}
              </Text>
              <Text className="weather-card__detail">
                {viewModel?.detailLine}
              </Text>
              {isStale && (
                <Text className="weather-card__hint">
                  数据可能已过期，点击刷新
                </Text>
              )}
            </View>
          </>
        )}
      </View>
      <Text className="weather-card__air">
        {status === "loading" || status === "idle"
          ? ""
          : status === "success" && viewModel
            ? viewModel.airQualityLabel
            : ""}
      </Text>
    </View>
  );
}
