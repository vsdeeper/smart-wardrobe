import { Gender } from "@/types/profile";
import { View, Text } from "@tarojs/components";
import { Loading } from "@nutui/nutui-react-taro";

import "./index.scss";

export interface GenderSetupChoicesProps {
  loading?: boolean;
  layout?: "dialog" | "inline";
  onSelect: (gender: Gender) => void;
}

export default function GenderSetupChoices({
  loading = false,
  layout = "dialog",
  onSelect,
}: GenderSetupChoicesProps) {
  const rootClass = [
    "gender-setup-choices",
    layout === "inline" && "gender-setup-choices--inline",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <View className={rootClass}>
      <View
        className={[
          "gender-setup-choices__btn gender-setup-choices__btn--primary",
          loading && "gender-setup-choices__btn--disabled",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={loading ? undefined : () => onSelect("female")}
      >
        {loading ? (
          <Loading
            type="circular"
            color="var(--sw-color-on-primary)"
            className="sw-btn-loading"
          />
        ) : (
          <Text className="gender-setup-choices__btn-text gender-setup-choices__btn-text--primary">
            我是女生
          </Text>
        )}
      </View>
      <View
        className={[
          "gender-setup-choices__btn gender-setup-choices__btn--secondary",
          loading && "gender-setup-choices__btn--disabled",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={loading ? undefined : () => onSelect("male")}
      >
        <Text className="gender-setup-choices__btn-text">我是男生</Text>
      </View>
    </View>
  );
}
