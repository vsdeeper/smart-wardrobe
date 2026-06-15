import { View, Image } from "@tarojs/components";
import totoroSrc from "@/assets/images/totoro.png";

import "./index.scss";

export interface DefaultAvatarProps {
  size?: "sm" | "lg";
  className?: string;
}

function DefaultAvatar({ size = "sm", className }: DefaultAvatarProps) {
  return (
    <View
      className={`default-avatar default-avatar--${size}${className ? ` ${className}` : ""}`}
    >
      <Image
        className="default-avatar__image"
        src={totoroSrc}
        mode="aspectFill"
      />
    </View>
  );
}

export default DefaultAvatar;
