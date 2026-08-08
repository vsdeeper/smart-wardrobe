import { View, Text } from "@tarojs/components";
import { Loading } from "@nutui/nutui-react-taro";

import "./index.scss";

export interface OverlayLoadingProps {
  /** 文案，默认「加载中...」 */
  text?: string;
  /** 额外 class，如调整遮罩透明度 */
  className?: string;
}

function OverlayLoading({ text = "加载中...", className }: OverlayLoadingProps) {
  return (
    <View
      className={["overlay-loading", className].filter(Boolean).join(" ")}
    >
      <Loading type="circular" direction="vertical">
        {text ? <Text>{text}</Text> : null}
      </Loading>
    </View>
  );
}

export default OverlayLoading;
