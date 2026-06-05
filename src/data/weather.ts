/** 内部统一天气代码（对接 API 前先 normalize 到此枚举） */
export type WeatherConditionCode =
  | "sunny"
  | "cloudy"
  | "overcast"
  | "rainy"
  | "snowy"
  | "foggy"
  | "thunderstorm"
  | "windy";

export interface WeatherConditionPreset {
  code: WeatherConditionCode;
  label: string;
  icon: string;
}

export type AirQualityLevel =
  | "excellent"
  | "good"
  | "moderate"
  | "unhealthy"
  | "hazardous";

export interface AirQualityPreset {
  level: AirQualityLevel;
  label: string;
  aqiMin: number;
  aqiMax: number;
}

export interface WeatherSnapshot {
  city: string;
  conditionCode: WeatherConditionCode;
  temperature: number;
  humidity: number;
  aqi: number;
}

export interface WeatherCardViewModel {
  icon: string;
  locationLine: string;
  detailLine: string;
  airQualityLabel: string;
}

export const WEATHER_CONDITION_PRESETS: Record<
  WeatherConditionCode,
  WeatherConditionPreset
> = {
  sunny: { code: "sunny", label: "晴", icon: "☀️" },
  cloudy: { code: "cloudy", label: "多云", icon: "⛅" },
  overcast: { code: "overcast", label: "阴", icon: "☁️" },
  rainy: { code: "rainy", label: "雨", icon: "🌧️" },
  snowy: { code: "snowy", label: "雪", icon: "❄️" },
  foggy: { code: "foggy", label: "雾", icon: "🌫️" },
  thunderstorm: { code: "thunderstorm", label: "雷暴", icon: "⛈️" },
  windy: { code: "windy", label: "风", icon: "💨" },
};

export const AIR_QUALITY_PRESETS: AirQualityPreset[] = [
  { level: "excellent", label: "优", aqiMin: 0, aqiMax: 50 },
  { level: "good", label: "良", aqiMin: 51, aqiMax: 100 },
  { level: "moderate", label: "轻度污染", aqiMin: 101, aqiMax: 150 },
  { level: "unhealthy", label: "中度污染", aqiMin: 151, aqiMax: 200 },
  { level: "hazardous", label: "重度污染", aqiMin: 201, aqiMax: 9999 },
];

export const DEMO_WEATHER_SNAPSHOT: WeatherSnapshot = {
  city: "伦敦",
  conditionCode: "sunny",
  temperature: 21,
  humidity: 42,
  aqi: 35,
};

const QWEATHER_ICON_MAP: Array<[number, number, WeatherConditionCode]> = [
  [100, 100, "sunny"],
  [150, 150, "sunny"],
  [101, 103, "cloudy"],
  [104, 104, "overcast"],
  [151, 153, "cloudy"],
  [300, 399, "rainy"],
  [400, 499, "snowy"],
  [500, 515, "foggy"],
  [302, 302, "thunderstorm"],
];

/** 按和风 icon 字段映射为内部天气代码 */
export function mapQWeatherIcon(iconCode: string | number): WeatherConditionCode {
  const code = Number(iconCode);
  if (Number.isNaN(code)) {
    return "sunny";
  }
  for (const [min, max, condition] of QWEATHER_ICON_MAP) {
    if (code >= min && code <= max) {
      return condition;
    }
  }
  if (code >= 900 && code <= 901) {
    return "windy";
  }
  return "sunny";
}

export function getWeatherConditionPreset(
  code: WeatherConditionCode,
): WeatherConditionPreset {
  return WEATHER_CONDITION_PRESETS[code] ?? WEATHER_CONDITION_PRESETS.sunny;
}

export function getAirQualityPreset(aqi: number): AirQualityPreset {
  const safeAqi = Math.max(0, Math.round(aqi));
  const preset = AIR_QUALITY_PRESETS.find(
    (item) => safeAqi >= item.aqiMin && safeAqi <= item.aqiMax,
  );
  return preset ?? AIR_QUALITY_PRESETS[AIR_QUALITY_PRESETS.length - 1];
}

/** 将 API 常见字符串 normalize 为 WeatherConditionCode */
export function normalizeWeatherCondition(input: string): WeatherConditionCode {
  const text = input.trim().toLowerCase();
  if (/晴|sunny|clear/.test(text)) return "sunny";
  if (/多云|partly|few cloud/.test(text)) return "cloudy";
  if (/阴|overcast/.test(text)) return "overcast";
  if (/雨|rain|drizzle|shower/.test(text)) return "rainy";
  if (/雪|snow/.test(text)) return "snowy";
  if (/雾|霾|fog|haze|mist/.test(text)) return "foggy";
  if (/雷|thunder|storm/.test(text)) return "thunderstorm";
  if (/风|wind/.test(text)) return "windy";
  return "sunny";
}

export function normalizeAirQualityCategory(
  category: string,
  aqi: number,
): AirQualityPreset {
  const label = category.trim();
  const byLabel = AIR_QUALITY_PRESETS.find((item) => item.label === label);
  if (byLabel) {
    return byLabel;
  }
  return getAirQualityPreset(aqi);
}

export function buildWeatherCardView(
  snapshot: WeatherSnapshot,
): WeatherCardViewModel {
  const condition = getWeatherConditionPreset(snapshot.conditionCode);
  const air = getAirQualityPreset(snapshot.aqi);

  return {
    icon: condition.icon,
    locationLine: `${condition.label}，${snapshot.city}`,
    detailLine: `${snapshot.temperature}°C • 湿度 ${snapshot.humidity}%`,
    airQualityLabel: `空气质量${air.label}`,
  };
}
