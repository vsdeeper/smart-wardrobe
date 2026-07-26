import type { ReactNode } from "react";
import { View } from "@tarojs/components";
import "./index.scss";

export interface OutfitCardProps {
  hero: ReactNode;
  children: ReactNode;
}

export default function OutfitCard({ hero, children }: OutfitCardProps) {
  return (
    <View className="outfit-card">
      {hero}
      <View className="outfit-card__body">{children}</View>
    </View>
  );
}
