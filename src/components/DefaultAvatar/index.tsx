import { useEffect, useState } from "react";
import { View, Image } from "@tarojs/components";
import baicaiSrc from "@/assets/images/baicai.png";

import "./index.scss";

export interface DefaultAvatarProps {
  size?: "sm" | "lg";
  className?: string;
  src?: string;
  onLoadError?: () => void;
}

function DefaultAvatar({
  size = "sm",
  className,
  src,
  onLoadError,
}: DefaultAvatarProps) {
  const [displaySrc, setDisplaySrc] = useState(src || baicaiSrc);

  useEffect(() => {
    setDisplaySrc(src || baicaiSrc);
  }, [src]);

  const handleError = () => {
    if (displaySrc === baicaiSrc) return;
    setDisplaySrc(baicaiSrc);
    onLoadError?.();
  };

  return (
    <View
      className={`default-avatar default-avatar--${size}${className ? ` ${className}` : ""}`}
    >
      <Image
        className="default-avatar__image"
        src={displaySrc}
        mode="aspectFill"
        onError={handleError}
      />
    </View>
  );
}

export default DefaultAvatar;
