import { View, Text } from "@tarojs/components";
import { ArrowDown, ArrowUp, Close } from "@nutui/icons-react-taro";
import { Image } from "@nutui/nutui-react-taro";
import SolidButton from "@/components/SolidButton";
import type { WardrobeItem } from "@/data/wardrobe";
import "./index.scss";

export interface OutfitPanelProps {
  pieces: WardrobeItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSave: () => void;
  onRemovePiece: (item: WardrobeItem) => void;
}

export default function OutfitPanel({
  pieces,
  collapsed,
  onToggleCollapsed,
  onSave,
  onRemovePiece,
}: OutfitPanelProps) {
  const canSave = pieces.length > 0;

  return (
    <View
      className={["outfit-panel", collapsed && "outfit-panel--collapsed"]
        .filter(Boolean)
        .join(" ")}
    >
      <View className="outfit-panel__card">
        <View className="outfit-panel__toggle" onClick={onToggleCollapsed}>
          {collapsed ? (
            <ArrowUp size={12} color="var(--nutui-gray-4)" />
          ) : (
            <ArrowDown size={12} color="var(--nutui-gray-4)" />
          )}
        </View>
        <View className="outfit-panel__header">
          <View className="outfit-panel__info">
            <Text className="outfit-panel__title">当前搭配</Text>
            <Text className="outfit-panel__desc">
              已选 {pieces.length} 件单品
            </Text>
          </View>
          <SolidButton disabled={!canSave} onClick={onSave}>
            {canSave ? "保存搭配" : "请选单品"}
          </SolidButton>
        </View>

        <View className="outfit-panel__thumbs">
          <View className="outfit-panel__thumbs-inner">
            {pieces.map((piece) => (
              <View key={piece._id} className="outfit-thumb">
                <View className="outfit-thumb__box">
                  <View className="outfit-thumb__media">
                    <Image
                      className="outfit-thumb__image"
                      src={piece.imageUrl ?? ""}
                      mode="aspectFill"
                    />
                  </View>
                  <View
                    className="outfit-thumb__remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemovePiece(piece);
                    }}
                  >
                    <Close size={8} color="var(--sw-color-on-primary)" />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
