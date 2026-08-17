import { Gender } from "@/types/profile";
import { View, Text } from "@tarojs/components";
import GenderSetupChoices from "@/components/GenderSetupChoices";
import OutlineButton from "@/components/OutlineButton";
import SolidButton from "@/components/SolidButton";
import WearDateSelector from "../WearDateSelector";

import "./index.scss";

export type TryOnEmptyStateProps =
  | {
      variant: "needsGender";
      genderSaving: boolean;
      onGenderSelect: (gender: Gender) => void;
    }
  | {
      variant: "ready";
      plannedWearDateKey: string;
      onWearDateChange: (dateKey: string) => void;
      onRecommend: () => void;
      onGoOutfit: () => void;
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

  if (props.variant === "ready") {
    return (
      <View className="try-on-empty try-on-empty--ready">
        <Text className="try-on-empty__title">打算什么时候穿？</Text>
        <WearDateSelector
          value={props.plannedWearDateKey}
          onChange={props.onWearDateChange}
        />
        <View className="try-on-empty__actions">
          <SolidButton block onClick={props.onRecommend}>
            推荐穿搭
          </SolidButton>
          <OutlineButton block onClick={props.onGoOutfit}>
            我要搭配
          </OutlineButton>
        </View>
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
        <SolidButton onClick={props.onGoWardrobe}>去上传衣物</SolidButton>
      </View>
    );
  }

  return (
    <View className="try-on-empty">
      <Text className="try-on-empty__title">这次没推荐成功</Text>
      <Text className="try-on-empty__desc">{props.errorMessage}</Text>
      <SolidButton onClick={props.onRetry}>重试</SolidButton>
    </View>
  );
}

export default TryOnEmptyState;
