import {
  AIR_QUALITY_PRESETS,
  WEATHER_CONDITION_PRESETS,
} from "@/constants/weather";
import type {
  AirQualityPreset,
  WeatherCardViewModel,
  WeatherConditionCode,
  WeatherConditionPreset,
  WeatherSnapshot,
} from "@/types/weather";

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
export function mapQWeatherIcon(
  iconCode: string | number,
): WeatherConditionCode {
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

export function formatLocationLabel(city: string, district?: string): string {
  const safeCity = city.trim() || "当前位置";
  const safeDistrict = district?.trim();
  if (safeDistrict && safeDistrict !== safeCity) {
    return `${safeCity} ${safeDistrict}`;
  }
  return safeCity;
}

export function buildWeatherCardView(
  snapshot: WeatherSnapshot,
): WeatherCardViewModel {
  const condition = getWeatherConditionPreset(snapshot.conditionCode);
  const air = getAirQualityPreset(snapshot.aqi);
  const locationLabel = formatLocationLabel(snapshot.city, snapshot.district);

  return {
    icon: condition.icon,
    locationLine: `${condition.label}，${locationLabel}`,
    detailLine: `${snapshot.temperature}°C • 湿度 ${snapshot.humidity}%`,
    airQualityLabel: air.label,
    temperature: snapshot.temperature,
    conditionLabel: condition.label,
  };
}
