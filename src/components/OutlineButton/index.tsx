import type { ReactNode } from "react";
import { View, Text } from "@tarojs/components";

import "./index.scss";

export interface OutlineButtonProps {
  children: ReactNode;
  /** 通栏撑满；默认 false 为内容自适应宽度 */
  block?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

function OutlineButton({
  children,
  block = false,
  disabled,
  className,
  onClick,
}: OutlineButtonProps) {
  return (
    <View
      className={[
        "outline-button",
        block && "outline-button--block",
        disabled && "outline-button--disabled",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={disabled ? undefined : onClick}
    >
      <Text className="outline-button__text">{children}</Text>
    </View>
  );
}

export default OutlineButton;
