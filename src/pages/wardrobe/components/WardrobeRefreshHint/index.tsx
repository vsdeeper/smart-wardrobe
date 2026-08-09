import { View, Text } from "@tarojs/components";
import "./index.scss";

export interface WardrobeRefreshHintProps {
  onClick?: () => void;
  loading?: boolean;
  /** 有新衣物的分类名，如「上装」「外套」 */
  typeNames?: string[];
}

function formatHintText(typeNames: string[]): string {
  const names = typeNames.filter(Boolean);
  if (names.length === 0) return "有新衣物入库，点击刷新";
  const labels = names.map((name) => `新${name}`).join("、");
  return `有${labels}入库，点击刷新`;
}

export default function WardrobeRefreshHint({
  onClick,
  loading = false,
  typeNames = [],
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
        {loading ? "正在刷新…" : formatHintText(typeNames)}
      </Text>
    </View>
  );
}
