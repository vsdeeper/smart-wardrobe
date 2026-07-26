import { View, Text } from "@tarojs/components";
import { Loading } from "@nutui/nutui-react-taro";

import "./index.scss";

export interface PageLoadingProps {
  /** 文案，默认「加载中...」 */
  text?: string;
  /** 网格内联等场景，如 `page-loading--inline` */
  className?: string;
}

function PageLoading({ text = "加载中...", className }: PageLoadingProps) {
  return (
    <View
      className={["page-loading", className].filter(Boolean).join(" ")}
    >
      <Loading type="circular" />
      {text ? <Text className="page-loading__text">{text}</Text> : null}
    </View>
  );
}

export default PageLoading;
