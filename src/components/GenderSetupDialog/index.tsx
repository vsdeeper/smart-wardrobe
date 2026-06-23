import { View, Text } from "@tarojs/components";
import GenderSetupChoices from "@/components/GenderSetupChoices";
import type { Gender } from "@/data/profile";
import "./index.scss";

export interface GenderSetupDialogProps {
  visible: boolean;
  title?: string;
  description?: string;
  loading?: boolean;
  onSelect: (gender: Gender) => void;
  onCancel?: () => void;
}

const DEFAULT_TITLE = "请先选择性别";
const DEFAULT_DESC =
  "选择后将用于 AI 穿搭推荐、虚拟试穿与衣物识别，您可在个人资料中修改身高体重。";

export default function GenderSetupDialog({
  visible,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
  loading = false,
  onSelect,
  onCancel,
}: GenderSetupDialogProps) {
  if (!visible) return null;

  return (
    <View className="gender-setup-dialog">
      <View className="gender-setup-dialog__mask" onClick={onCancel} />
      <View className="gender-setup-dialog__panel">
        <Text className="gender-setup-dialog__title">{title}</Text>
        <Text className="gender-setup-dialog__desc">{description}</Text>
        <GenderSetupChoices
          layout="dialog"
          loading={loading}
          onSelect={onSelect}
        />
        {onCancel ? (
          <View className="gender-setup-dialog__cancel" onClick={onCancel}>
            <Text className="gender-setup-dialog__cancel-text">稍后再说</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
