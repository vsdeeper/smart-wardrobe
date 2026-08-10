import { WardrobeItem } from "@/types/wardrobe";
import { View, Text } from "@tarojs/components";
import { Tag } from "@nutui/nutui-react-taro";

import { formatDateTime, formatUpdatedAt } from "@/utils/format-date-time";
import "./index.scss";

const STYLING_ADVICE_PLACEHOLDER = "暂无穿搭建议，将在 AI 识别阶段生成";

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
  const adviceText = item.stylingAdvice?.trim() || STYLING_ADVICE_PLACEHOLDER;
  const isAdvicePlaceholder = !item.stylingAdvice?.trim();

  return (
    <View className="wardrobe-detail-info">
      <InfoRow label="类别 / 名称">
        <Text className="wardrobe-detail-info__text">
          {item.typeName} / {item.name}
        </Text>
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
        <Text className="wardrobe-detail-info__label">穿搭建议</Text>
        <View
          className={[
            "wardrobe-detail-info__outfit-box",
            isAdvicePlaceholder &&
              "wardrobe-detail-info__outfit-box--placeholder",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Text className="wardrobe-detail-info__outfit-text">
            {adviceText}
          </Text>
        </View>
      </View>
    </View>
  );
}
