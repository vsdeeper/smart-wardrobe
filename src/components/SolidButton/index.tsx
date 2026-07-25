import type { ReactNode } from "react";
import { View, Text } from "@tarojs/components";
import { Loading } from "@nutui/nutui-react-taro";

import "./index.scss";

export interface SolidButtonProps {
  children: ReactNode;
  /** 通栏撑满；默认 false 为内容自适应宽度 */
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

function SolidButton({
  children,
  block = false,
  disabled,
  loading,
  className,
  onClick,
}: SolidButtonProps) {
  const inactive = Boolean(disabled || loading);

  return (
    <View
      className={[
        "solid-button",
        block && "solid-button--block",
        disabled && "solid-button--disabled",
        loading && "solid-button--loading",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={inactive ? undefined : onClick}
    >
      {loading ? (
        <Loading
          type="circular"
          color="var(--sw-color-on-primary)"
          className="solid-button__loading"
        />
      ) : (
        <Text className="solid-button__text">{children}</Text>
      )}
    </View>
  );
}

export default SolidButton;
