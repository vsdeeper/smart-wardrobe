import type { WeatherSnapshot } from "@/types/weather";
import Taro from "@tarojs/taro";


export type WeatherLoadStatus =
  | "idle"
  | "loading"
  | "success"
  | "location_denied"
  | "error";

export class LocationDeniedError extends Error {
  name = "LocationDeniedError";

  constructor(message = "需要定位才能查看天气") {
    super(message);
  }
}

export interface FetchWeatherResult {
  snapshot: WeatherSnapshot;
  fromCache: boolean;
  stale?: boolean;
}

interface WeatherCacheEntry {
  snapshot: WeatherSnapshot;
  fetchedAt: number;
}

interface WeatherCloudSuccess extends WeatherSnapshot {}

interface WeatherCloudError {
  error: string;
  message: string;
}

const CACHE_KEY = "sw_weather_cache";
const CACHE_TTL_MS = 30 * 60 * 1000;

function isLocationDenied(err: unknown): boolean {
  if (err instanceof LocationDeniedError) {
    return true;
  }
  const msg =
    err && typeof err === "object" && "errMsg" in err
      ? String((err as { errMsg: string }).errMsg)
      : "";
  return /auth deny|authorize|permission denied|fail auth/i.test(msg);
}

function readCache(): WeatherCacheEntry | null {
  try {
    const raw = Taro.getStorageSync(CACHE_KEY) as WeatherCacheEntry | "";
    if (!raw || typeof raw !== "object" || !raw.snapshot || !raw.fetchedAt) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

function writeCache(snapshot: WeatherSnapshot) {
  const entry: WeatherCacheEntry = {
    snapshot,
    fetchedAt: Date.now(),
  };
  Taro.setStorageSync(CACHE_KEY, entry);
}

function isCacheValid(entry: WeatherCacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

async function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  try {
    const res = await Taro.getLocation({ type: "gcj02" });
    return {
      latitude: res.latitude,
      longitude: res.longitude,
    };
  } catch (err) {
    if (isLocationDenied(err)) {
      throw new LocationDeniedError();
    }
    throw new LocationDeniedError("定位没成功，请检查是否已开启定位");
  }
}

function isCloudError(
  data: WeatherCloudSuccess | WeatherCloudError,
): data is WeatherCloudError {
  return "error" in data && typeof data.error === "string";
}

async function fetchWeatherFromCloud(
  latitude: number,
  longitude: number,
): Promise<WeatherSnapshot> {
  const { result } = await Taro.cloud.callFunction({
    name: "weather",
    data: { latitude, longitude },
  });

  const data = result as WeatherCloudSuccess | WeatherCloudError;

  if (isCloudError(data)) {
    throw new Error(data.message || data.error);
  }

  return {
    city: data.city,
    district: data.district || undefined,
    conditionCode: data.conditionCode as WeatherSnapshot["conditionCode"],
    temperature: data.temperature,
    humidity: data.humidity,
    aqi: data.aqi,
  };
}

export async function fetchWeather(options?: {
  force?: boolean;
}): Promise<FetchWeatherResult> {
  const force = options?.force === true;
  const cached = readCache();

  if (!force && cached && isCacheValid(cached)) {
    return { snapshot: cached.snapshot, fromCache: true };
  }

  const { latitude, longitude } = await getCurrentLocation();

  try {
    const snapshot = await fetchWeatherFromCloud(latitude, longitude);
    writeCache(snapshot);
    return { snapshot, fromCache: false };
  } catch (err) {
    if (cached && isCacheValid(cached)) {
      return { snapshot: cached.snapshot, fromCache: true, stale: true };
    }
    throw err;
  }
}

export { CACHE_TTL_MS };
