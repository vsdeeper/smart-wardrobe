import { View, Text } from "@tarojs/components";

export interface WearCtaProps {
  disabled?: boolean;
  onWear: () => void;
}

export default function WearCta({ disabled, onWear }: WearCtaProps) {
  return (
    <View className="wear-btn-wrap">
      <View
        className={["wear-btn", disabled && "wear-btn--disabled"]
          .filter(Boolean)
          .join(" ")}
        onClick={disabled ? undefined : onWear}
      >
        <Text className="wear-btn__text">就穿这一身</Text>
      </View>
    </View>
  );
}
