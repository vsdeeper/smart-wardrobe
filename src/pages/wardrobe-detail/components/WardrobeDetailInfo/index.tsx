import { View, Text } from "@tarojs/components";
import { Tag } from "@nutui/nutui-react-taro";
import type { WardrobeItem } from "@/data/wardrobe";
import { formatDateTime, formatUpdatedAt } from "@/utils/formatDateTime";
import "./index.scss";

const OUTFIT_PLACEHOLDER = "暂无搭配推荐，将在 AI 识别阶段生成";

export interface WardrobeDetailInfoProps {
  item: WardrobeItem;
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="wardrobe-detail-info__row">
      <Text className="wardrobe-detail-info__label">{label}</Text>
      <View className="wardrobe-detail-info__value">{children}</View>
    </View>
  );
}

export default function WardrobeDetailInfo({ item }: WardrobeDetailInfoProps) {
  const tags = item.tags ?? [];
  const outfitText = item.outfitRecommendation?.trim() || OUTFIT_PLACEHOLDER;
  const isOutfitPlaceholder = !item.outfitRecommendation?.trim();

  return (
    <View className="wardrobe-detail-info">
      <InfoRow label="名称">
        <Text className="wardrobe-detail-info__text">{item.name}</Text>
      </InfoRow>

      <InfoRow label="类别">
        <Text className="wardrobe-detail-info__text">{item.typeName}</Text>
      </InfoRow>

      <InfoRow label="标签">
        {tags.length > 0 ? (
          <View className="wardrobe-detail-info__tags">
            {tags.map((tag) => (
              <Tag
                key={tag}
                round
                className="sw-tag"
                background="var(--sw-color-tag-bg)"
                color="var(--sw-color-tag-text)"
              >
                {tag}
              </Tag>
            ))}
          </View>
        ) : (
          <Text className="wardrobe-detail-info__text wardrobe-detail-info__text--muted">
            暂无标签
          </Text>
        )}
      </InfoRow>

      <InfoRow label="创建时间">
        <Text className="wardrobe-detail-info__text">
          {formatDateTime(item.createdAt)}
        </Text>
      </InfoRow>

      <InfoRow label="更新时间">
        <Text className="wardrobe-detail-info__text">
          {formatUpdatedAt(item.updatedAt, item.createdAt)}
        </Text>
      </InfoRow>

      <View className="wardrobe-detail-info__outfit">
        <Text className="wardrobe-detail-info__label">搭配推荐</Text>
        <View
          className={[
            "wardrobe-detail-info__outfit-box",
            isOutfitPlaceholder &&
              "wardrobe-detail-info__outfit-box--placeholder",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Text className="wardrobe-detail-info__outfit-text">
            {outfitText}
          </Text>
        </View>
      </View>
    </View>
  );
}
