import { View, Text } from "@tarojs/components";
import "./index.scss";

export interface WardrobeRefreshHintProps {
  onClick?: () => void;
  loading?: boolean;
}

export default function WardrobeRefreshHint({
  onClick,
  loading = false,
}: WardrobeRefreshHintProps) {
  return (
    <View
      className={[
        "wardrobe-refresh-hint",
        loading && "wardrobe-refresh-hint--loading",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => {
        if (loading) return;
        onClick?.();
      }}
    >
      <Text className="wardrobe-refresh-hint__text">
        {loading ? "正在刷新…" : "有新衣物入库，点击刷新"}
      </Text>
    </View>
  );
}
