import { Gender } from "@/types/profile";
import { View, Text } from "@tarojs/components";
import GenderSetupChoices from "@/components/GenderSetupChoices";

import "./index.scss";

export type TryOnEmptyStateProps =
  | {
      variant: "needsGender";
      genderSaving: boolean;
      onGenderSelect: (gender: Gender) => void;
    }
  | { variant: "empty"; onGoWardrobe: () => void }
  | { variant: "error"; errorMessage: string | null; onRetry: () => void };

function TryOnEmptyState(props: TryOnEmptyStateProps) {
  if (props.variant === "needsGender") {
    return (
      <View className="try-on-empty try-on-empty--gender">
        <Text className="try-on-empty__title">请先选择性别</Text>
        <Text className="try-on-empty__desc">
          选择后将用于 AI 穿搭推荐与虚拟试穿，您可在个人资料中修改身高体重。
        </Text>
        <GenderSetupChoices
          layout="inline"
          loading={props.genderSaving}
          onSelect={props.onGenderSelect}
        />
      </View>
    );
  }

  if (props.variant === "empty") {
    return (
      <View className="try-on-empty">
        <Text className="try-on-empty__title">衣橱还是空的</Text>
        <Text className="try-on-empty__desc">
          上传衣物后，AI 将根据天气与场景为您推荐穿搭
        </Text>
        <View className="try-on-empty__cta" onClick={props.onGoWardrobe}>
          <Text className="try-on-empty__cta-text">去上传衣物</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="try-on-empty">
      <Text className="try-on-empty__title">这次没推荐成功</Text>
      <Text className="try-on-empty__desc">{props.errorMessage}</Text>
      <View className="try-on-empty__cta" onClick={props.onRetry}>
        <Text className="try-on-empty__cta-text">重试</Text>
      </View>
    </View>
  );
}

export default TryOnEmptyState;
