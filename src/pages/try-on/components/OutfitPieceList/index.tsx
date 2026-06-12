import { View, Text } from "@tarojs/components";
import { Edit } from "@nutui/icons-react-taro";
import { Image } from "@nutui/nutui-react-taro";
import type { WardrobeItem } from "@/data/wardrobe";

export interface OutfitPieceListProps {
  pieces: WardrobeItem[];
  onEditOutfit: () => void;
}

export default function OutfitPieceList({
  pieces,
  onEditOutfit,
}: OutfitPieceListProps) {
  return (
    <View className="outfit-list">
      <View className="outfit-list__header">
        <Text className="outfit-list__title">搭配清单</Text>
        <View className="outfit-list__edit" onClick={onEditOutfit}>
          <Text className="outfit-list__edit-text">修改搭配</Text>
          <Edit size={14} color="var(--nutui-brand-6)" />
        </View>
      </View>
      <View className="outfit-list__grid">
        {pieces.map((piece) => (
          <View
            key={piece._id}
            className="outfit-piece"
            hoverClass="outfit-piece--pressed"
            hoverStartTime={0}
            hoverStayTime={100}
          >
            <View className="outfit-piece__image-wrap">
              <Image
                className="outfit-piece__image"
                src={piece.imageUrl ?? ""}
                mode="aspectFill"
              />
            </View>
            <View className="outfit-piece__body">
              <Text className="outfit-piece__category">{piece.typeName}</Text>
              <Text className="outfit-piece__name">{piece.name}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
