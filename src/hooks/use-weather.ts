import { buildWeatherCardView } from "@/utils/weather";
import { type WeatherCardViewModel } from "@/types/weather";
import { toUserMessage } from "@/utils/error-message";
import { useCallback, useRef, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";

import {
  fetchWeather,
  LocationDeniedError,
  type WeatherLoadStatus,
} from "@/services/weather";

export function useWeather() {
  const [viewModel, setViewModel] = useState<WeatherCardViewModel | null>(null);
  const [status, setStatus] = useState<WeatherLoadStatus>("idle");
  const [isStale, setIsStale] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const refresh = useCallback(async (force = false) => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    setStatus("loading");
    setErrorMessage(null);
    setIsStale(false);

    try {
      const result = await fetchWeather({ force });
      setViewModel(buildWeatherCardView(result.snapshot));
      setStatus("success");
      setIsStale(result.stale === true);
    } catch (err) {
      if (err instanceof LocationDeniedError) {
        setViewModel(null);
        setStatus("location_denied");
        setErrorMessage(err.message);
        return;
      }

      const message = toUserMessage(err, "天气信息暂时获取不到，请稍后重试");
      setViewModel(null);
      setStatus("error");
      setErrorMessage(message);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const requestLocation = useCallback(async () => {
    try {
      const setting = await Taro.openSetting();
      if (setting.authSetting["scope.userLocation"]) {
        await refresh(true);
      }
    } catch {
      Taro.showToast({
        title: "打不开系统设置，请手动开启定位",
        icon: "none",
      });
    }
  }, [refresh]);

  useDidShow(() => {
    refresh(false);
  });

  const handleCardClick = useCallback(() => {
    if (status === "loading") {
      return;
    }
    if (status === "location_denied") {
      requestLocation();
      return;
    }
    refresh(true);
  }, [status, requestLocation, refresh]);

  return {
    viewModel,
    status,
    isStale,
    errorMessage,
    refresh,
    requestLocation,
    handleCardClick,
  };
}
