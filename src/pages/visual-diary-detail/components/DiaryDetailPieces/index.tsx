import { View, Text } from "@tarojs/components";
import { Image } from "@nutui/nutui-react-taro";
import type { WardrobeItem } from "@/data/wardrobe";
import "./index.scss";

export interface DiaryDetailPiecesProps {
  pieces: WardrobeItem[];
  onPieceClick: (pieceId: string) => void;
}

export default function DiaryDetailPieces({
  pieces,
  onPieceClick,
}: DiaryDetailPiecesProps) {
  if (pieces.length === 0) return null;

  return (
    <View className="diary-detail-pieces">
      <Text className="diary-detail-pieces__title">搭配清单</Text>
      <View className="diary-detail-pieces__grid">
        {pieces.map((piece) => (
          <View
            key={piece._id}
            className="diary-detail-pieces__item"
            hoverClass="diary-detail-pieces__item--pressed"
            hoverStartTime={0}
            hoverStayTime={100}
            onClick={() => onPieceClick(piece._id)}
          >
            <View className="diary-detail-pieces__image-wrap">
              <Image
                className="diary-detail-pieces__image"
                src={piece.imageUrl || piece.imageFileId}
                mode="aspectFill"
              />
            </View>
            <View className="diary-detail-pieces__body">
              <Text className="diary-detail-pieces__category">
                {piece.typeName}
              </Text>
              <Text className="diary-detail-pieces__name">{piece.name}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
