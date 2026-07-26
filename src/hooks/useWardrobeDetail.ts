import { useCallback, useState } from "react";
import Taro, { useLoad } from "@tarojs/taro";
import type { WardrobeItem } from "@/data/wardrobe";
import { fetchWardrobeItemById } from "@/services/wardrobe";

export function useWardrobeDetail() {
  const [item, setItem] = useState<WardrobeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    Taro.navigateBack();
  }, []);

  useLoad((options) => {
    const id = options.id;
    if (!id) {
      Taro.showToast({ title: "暂时打不开这件衣物，请返回重试", icon: "none" });
      Taro.navigateBack();
      return;
    }

    if (process.env.TARO_ENV !== "weapp") {
      setLoading(false);
      setError("请在微信小程序中使用");
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWardrobeItemById(id);
        setItem(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "衣物详情加载失败，请稍后重试";
        setError(message);
        Taro.showToast({ title: message, icon: "none" });
      } finally {
        setLoading(false);
      }
    })();
  });

  return {
    item,
    loading,
    error,
    handleBack,
  };
}
