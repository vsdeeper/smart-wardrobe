import { View, Text } from "@tarojs/components";
import type { VisualDiaryEntry } from "@/data/tryOn";
import { buildWeatherCardView } from "@/data/weather";
import { formatDateTime } from "@/utils/formatDateTime";
import "./index.scss";

export interface DiaryDetailMetaProps {
  entry: VisualDiaryEntry;
}

export default function DiaryDetailMeta({ entry }: DiaryDetailMetaProps) {
  const weather = entry.weatherSnapshot
    ? buildWeatherCardView(entry.weatherSnapshot)
    : null;

  return (
    <View className="diary-detail-meta card">
      <View className="diary-detail-meta__row">
        <Text className="diary-detail-meta__label">记录时间</Text>
        <Text className="diary-detail-meta__value">
          {formatDateTime(entry.createdAt)}
        </Text>
      </View>

      {weather ? (
        <View className="diary-detail-meta__weather">
          <View className="diary-detail-meta__weather-main">
            <Text
              className={`iconfont ${weather.icon} diary-detail-meta__weather-icon`}
            />
            <View className="diary-detail-meta__weather-info">
              <Text className="diary-detail-meta__weather-location">
                {weather.locationLine}
              </Text>
              <Text className="diary-detail-meta__weather-detail">
                {weather.detailLine}
              </Text>
            </View>
          </View>
          <Text className="diary-detail-meta__weather-air">
            {weather.airQualityLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
