import { View } from "@tarojs/components";
import SolidButton from "@/components/SolidButton";

export interface WearCtaProps {
  disabled?: boolean;
  onWear: () => void;
}

export default function WearCta({ disabled, onWear }: WearCtaProps) {
  return (
    <View className="wear-btn-wrap">
      <SolidButton block disabled={disabled} onClick={onWear}>
        穿上这身
      </SolidButton>
    </View>
  );
}
