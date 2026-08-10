import { View, Text, Button } from "@tarojs/components";
import { openPrivacyContract } from "@/utils/media-picker-error";
import "./index.scss";

export interface PrivacyAuthorizeDialogProps {
  visible: boolean;
  contractName?: string;
  onClose: () => void;
  onAgreed: () => void;
}

export default function PrivacyAuthorizeDialog({
  visible,
  contractName,
  onClose,
  onAgreed,
}: PrivacyAuthorizeDialogProps) {
  if (!visible) return null;

  const contractLabel = contractName?.trim() || "《用户隐私保护指引》";

  return (
    <View className="privacy-dialog">
      <View className="privacy-dialog__mask" onClick={onClose} />
      <View className="privacy-dialog__panel">
        <Text className="privacy-dialog__title">用户隐私保护提示</Text>
        <Text className="privacy-dialog__desc">
          上传衣物照片需阅读并同意{contractLabel}，以便从相册或相机选择图片并由
          AI 识别分类。
        </Text>
        <View
          className="privacy-dialog__link"
          onClick={() => openPrivacyContract()}
        >
          <Text className="privacy-dialog__link-text">查看协议</Text>
        </View>
        <View className="privacy-dialog__footer">
          <View className="privacy-dialog__btn privacy-dialog__btn--cancel" onClick={onClose}>
            <Text className="privacy-dialog__btn-text">取消</Text>
          </View>
          <Button
            id="wardrobe-privacy-agree-btn"
            className="privacy-dialog__btn privacy-dialog__btn--agree"
            openType="agreePrivacyAuthorization"
            onAgreePrivacyAuthorization={onAgreed}
          >
            同意并继续
          </Button>
        </View>
      </View>
    </View>
  );
}
