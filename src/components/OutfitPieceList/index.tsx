import { View, Text, ScrollView } from "@tarojs/components";
import { Image } from "@nutui/nutui-react-taro";
import type { WardrobeItem } from "@/data/wardrobe";
import { getCachedImageUrl } from "@/services/imageUrlCache";
import "./index.scss";

export interface OutfitPieceListProps {
  pieces: WardrobeItem[];
  onPieceClick?: (pieceId: string) => void;
}

export default function OutfitPieceList({
  pieces,
  onPieceClick,
}: OutfitPieceListProps) {
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
          <View
            key={piece._id}
            className="outfit-piece"
            hoverClass={onPieceClick ? "outfit-piece--pressed" : undefined}
            hoverStartTime={0}
            hoverStayTime={100}
            onClick={
              onPieceClick ? () => onPieceClick(piece._id) : undefined
            }
          >
            <View className="outfit-piece__image-wrap">
              <Image
                className="outfit-piece__image"
                src={getCachedImageUrl("wardrobe", piece.imageFileId)}
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
