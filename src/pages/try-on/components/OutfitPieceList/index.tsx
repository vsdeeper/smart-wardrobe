import { View, Text, ScrollView } from "@tarojs/components";
import { Image } from "@nutui/nutui-react-taro";
import type { WardrobeItem } from "@/data/wardrobe";
import "./index.scss";

export interface OutfitPieceListProps {
  pieces: WardrobeItem[];
}

export default function OutfitPieceList({ pieces }: OutfitPieceListProps) {
  if (pieces.length === 0) return null;

  return (
    <ScrollView
      className="outfit-list"
      scrollX
      showScrollbar={false}
      enhanced
    >
      <View className="outfit-list__row">
        {pieces.map((piece) => (
          <View key={piece._id} className="outfit-piece">
            <View className="outfit-piece__image-wrap">
              <Image
                className="outfit-piece__image"
                src={piece.imageUrl || piece.imageFileId}
                mode="aspectFit"
              />
            </View>
            <Text className="outfit-piece__name">{piece.name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
