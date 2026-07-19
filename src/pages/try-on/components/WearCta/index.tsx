import { View, Text } from "@tarojs/components";

export interface WearCtaProps {
  disabled?: boolean;
  onWear: () => void;
}

export default function WearCta({ disabled, onWear }: WearCtaProps) {
  return (
    <View className="wear-btn-wrap">
      <View
        className={[
          "sw-btn sw-btn--block sw-btn--primary",
          disabled && "sw-btn--disabled",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={disabled ? undefined : onWear}
      >
        <Text className="sw-btn__text sw-btn__text--primary">穿上这身</Text>
      </View>
    </View>
  );
}
