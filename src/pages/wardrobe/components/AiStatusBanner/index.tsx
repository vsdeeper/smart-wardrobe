import { View, Text } from "@tarojs/components";
import { Progress } from "@nutui/nutui-react-taro";
import type { AiStatus } from "@/data/wardrobe";
import { getAiStatusDesc } from "@/data/wardrobe";
import "./index.scss";

export interface AiStatusBannerProps {
  aiStatus: AiStatus;
}

export default function AiStatusBanner({ aiStatus }: AiStatusBannerProps) {
  const showProgress = aiStatus.phase !== "idle";

  return (
    <View className="ai-status">
      <View className="ai-status__content">
        <View className="ai-status__icon-wrap">
          <Text className="iconfont icon-magic-wand ai-status__icon" />
        </View>
        <View className="ai-status__text">
          <Text className="ai-status__label">AI 智能分类</Text>
          <Text className="ai-status__desc">{getAiStatusDesc(aiStatus)}</Text>
        </View>
      </View>
      {showProgress && (
        <Progress
          percent={aiStatus.progress}
          className="ai-status__progress sw-progress"
          color="var(--sw-color-accent)"
          background="var(--sw-color-progress-track)"
          showText={false}
        />
      )}
    </View>
  );
}
