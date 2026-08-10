import type {
  AirQualityPreset,
  WeatherConditionCode,
  WeatherConditionPreset,
  WeatherSnapshot,
} from "@/types/weather";

export const WEATHER_CONDITION_PRESETS: Record<
  WeatherConditionCode,
  WeatherConditionPreset
> = {
  sunny: { code: "sunny", label: "晴", icon: "icon-sunny" },
  cloudy: { code: "cloudy", label: "多云", icon: "icon-cloudy" },
  overcast: { code: "overcast", label: "阴", icon: "icon-overcast" },
  rainy: { code: "rainy", label: "雨", icon: "icon-rainy" },
  snowy: { code: "snowy", label: "雪", icon: "icon-snowy" },
  foggy: { code: "foggy", label: "雾", icon: "icon-foggy" },
  thunderstorm: {
    code: "thunderstorm",
    label: "雷暴",
    icon: "icon-thunderstorm",
  },
  windy: { code: "windy", label: "风", icon: "icon-windy" },
};

export const AIR_QUALITY_PRESETS: AirQualityPreset[] = [
  { level: "excellent", label: "空气质量优", aqiMin: 0, aqiMax: 50 },
  { level: "good", label: "空气质量良", aqiMin: 51, aqiMax: 100 },
  { level: "moderate", label: "轻度污染", aqiMin: 101, aqiMax: 150 },
  { level: "unhealthy", label: "中度污染", aqiMin: 151, aqiMax: 200 },
  { level: "hazardous", label: "重度污染", aqiMin: 201, aqiMax: 9999 },
];

export const DEMO_WEATHER_SNAPSHOT: WeatherSnapshot = {
  city: "北京",
  district: "朝阳",
  conditionCode: "sunny",
  temperature: 21,
  humidity: 42,
  aqi: 35,
};
