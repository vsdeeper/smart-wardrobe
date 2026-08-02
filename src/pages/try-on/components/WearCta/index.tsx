import { View } from "@tarojs/components";
import SolidButton from "@/components/SolidButton";
import "./index.scss";

export interface WearCtaProps {
  confirmed?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onWear: () => void;
}

export default function WearCta({
  confirmed,
  disabled,
  loading,
  onWear,
}: WearCtaProps) {
  return (
    <View className="wear-btn-wrap">
      <SolidButton block disabled={disabled} loading={loading} onClick={onWear}>
        {confirmed ? "我要搭配" : "穿上这身"}
      </SolidButton>
    </View>
  );
}
