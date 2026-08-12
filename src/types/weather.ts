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
  /** iconfont glyph 类名（如 icon-sunny），不含 iconfont 基类 */
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
  /** 行政区域（区/县），可选 */
  district?: string;
  /** 该快照对应的预报日 YYYY-MM-DD */
  dateKey?: string;
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
  temperature: number;
  conditionLabel: string;
}
