import type { ReactNode } from "react";
import { View, Text } from "@tarojs/components";
import { Loading } from "@nutui/nutui-react-taro";

import "./index.scss";

export interface OutlineButtonProps {
  children: ReactNode;
  /** 通栏撑满；默认 false 为内容自适应宽度 */
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

function OutlineButton({
  children,
  block = false,
  disabled,
  loading,
  className,
  onClick,
}: OutlineButtonProps) {
  const inactive = Boolean(disabled || loading);

  return (
    <View
      className={[
        "outline-button",
        block && "outline-button--block",
        disabled && "outline-button--disabled",
        loading && "outline-button--loading",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={inactive ? undefined : onClick}
    >
      {loading ? (
        <Loading
          type="circular"
          color="var(--nutui-brand-6)"
          className="outline-button__loading"
        />
      ) : (
        <Text className="outline-button__text">{children}</Text>
      )}
    </View>
  );
}

export default OutlineButton;
