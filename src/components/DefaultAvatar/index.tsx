import { View, Image } from "@tarojs/components";
import baicaiSrc from "@/assets/images/baicai.png";

import "./index.scss";

export interface DefaultAvatarProps {
  size?: "sm" | "lg";
  className?: string;
  src?: string;
}

function DefaultAvatar({ size = "sm", className, src }: DefaultAvatarProps) {
  return (
    <View
      className={`default-avatar default-avatar--${size}${className ? ` ${className}` : ""}`}
    >
      <Image
        className="default-avatar__image"
        src={src || baicaiSrc}
        mode="aspectFill"
      />
    </View>
  );
}

export default DefaultAvatar;
