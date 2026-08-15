import { useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { TextArea } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import SolidButton from "@/components/SolidButton";
import Main from "@/layouts/Main";
import { submitFeedback } from "@/services/feedback";
import "./index.scss";

const MAX_LENGTH = 500;

/**
 * 用户反馈页：提交意见至云库，供产品侧逐条查看。
 */
function FeedbackPage() {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      Taro.showToast({ title: "请填写反馈内容", icon: "none" });
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      await submitFeedback({ content: trimmed });
      Taro.showToast({ title: "已收到，感谢反馈", icon: "success" });
      setContent("");
      setTimeout(() => {
        Taro.navigateBack();
      }, 800);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "提交失败，请稍后重试";
      Taro.showToast({ title: message, icon: "none" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Main showTabbar={false} header={<AppNavbar showBack title="反馈" />}>
      <Main.Scroll>
        <View className="feedback-page">
          <Text className="feedback-page__hint">
            请描述问题或想法，并尽量注明场景（如识别 / 推荐 /
            试穿），便于我们对照排查。
          </Text>
          <View className="sw-field-textarea">
            <TextArea
              value={content}
              maxLength={MAX_LENGTH}
              rows={6}
              showCount
              placeholder="写下你的反馈…"
              onChange={(val) => setContent(val)}
            />
          </View>
          <SolidButton
            block
            className="feedback-page__submit"
            loading={submitting}
            disabled={!content.trim()}
            onClick={() => {
              void handleSubmit();
            }}
          >
            提交
          </SolidButton>
        </View>
      </Main.Scroll>
    </Main>
  );
}

export default FeedbackPage;
