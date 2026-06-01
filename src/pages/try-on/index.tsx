import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Edit } from "@nutui/icons-react-taro";
import { Image } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import Main from "@/layouts/Main";
import { useMainTabNavigation } from "@/utils/tabNavigation";
import "./index.scss";

/** 搭配清单单品 */
interface OutfitPiece {
  id: number;
  category: string;
  name: string;
  image: string;
}

const OUTFIT_PIECES: OutfitPiece[] = [
  {
    id: 1,
    category: "外套",
    name: "柔软亚麻西装",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBw3Rt1LTR0iAus-pSvKJmmYMaa3JYqAWnhZniCfKtRIdTxgC7juZkWot5ARP89TL4Ky6WU_G7L6wzAriFkwHEeb5wlQFJkZFryzSnF1-yFBAi3kREEqsiwhMfzne18MOXf3mqn6ZiOR3C4yCRWcpJVfltGUjTFWPSLAI9q_ER4P3ajRk3ImutzpNM5YS27qD9MSUpBX61-KL6hA3ZOJ-NnrTRYvJpsjSZKEtpyvms_PN2tTLGfmmlry8dOOIkfjkYTP1IFdRlTvOf4",
  },
  {
    id: 2,
    category: "下装",
    name: "阔腿斜纹裤",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD1fNe-82aDDhEx7bXwRQP-5plPuDic6nDBcHJebtYQE_L5JZRD8qlbQInmYMrSQ4-yPcT1TJOUgZ96WNmW3GUxncjssg8B7vrSH3TA_Okj2WdGtLDnlSpF8PZU4iMxMI5WQRSDfoyAI-ohMI1_AazahB0yHCOF2gGh7j-g45S07C_D2NcyFFij-LFl8HBAPz3TxycIbQ8IuQ44XIz6sLxujFHCbW_WigkUQmjJ3dicABQx-R7Dwcv3WIwNHnsQsqMetxZW1-jd4Hus",
  },
];

const OUTFIT_TIPS = [
  { id: 1, icon: "☀️", label: "高紫外线" },
  { id: 2, icon: "🌬️", label: "微风夜晚" },
];

function TryOnPage() {
  const { activeTab, onTabChange } = useMainTabNavigation(1);

  const handleWearOutfit = () => {
    Taro.showToast({ title: "已记录今日穿搭", icon: "success" });
  };

  const handleEditOutfit = () => {
    Taro.showToast({ title: "修改搭配", icon: "none" });
  };

  return (
    <Main
      activeTab={activeTab}
      onTabChange={onTabChange}
      scrollClassName="main-scroll--try-on"
      header={<AppNavbar />}
    >
      <Main.Scroll>
        <View className="weather-card">
          <View className="weather-card__main">
            <Text className="weather-card__icon">☀️</Text>
            <View className="weather-card__info">
              <Text className="weather-card__location">晴，伦敦</Text>
              <Text className="weather-card__detail">21°C • 湿度 42%</Text>
            </View>
          </View>
          <Text className="weather-card__air">空气质量优</Text>
        </View>

        <View className="outfit-hero">
          <Image
            className="outfit-hero__image"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8K-x4y62yK7S3I0Q2U7xQ1P5iw8vcF3kYcE3JLKFKOHY9bcMe387S2mSv6_CQfpLm8kPlby4z0xKBqFjjaFFLdzGDrUwQJXz11SsbkIPxeQ-REFofqE0pPIM_Zdl4lQvG0gSRBl9cAmBoWZxsl7vsal8LGFJhp2kfNQZ7dHC_E-flSNvm0GMOBoO3yVFIQHm8InY21qHKOnkRLzacEczz5WaVparbMDByJ5Mlc8A9FMsxZEOxX-YekWysIeNTQabn6uVBdWvDQMS5"
            mode="aspectFill"
          />
          <View className="outfit-hero__gradient" aria-hidden />
          <View className="outfit-hero__badge">
            <Text className="outfit-hero__badge-icon">★</Text>
            <Text className="outfit-hero__badge-text">匹配度 98%</Text>
          </View>
          <View className="outfit-hero__content">
            <Text className="outfit-hero__title">优雅亚麻</Text>
            <Text className="outfit-hero__desc">
              非常适合您下午两点的画廊开幕式，以及随后的微风晚宴。
            </Text>
          </View>
        </View>

        <View className="outfit-list">
          <View className="outfit-list__header">
            <Text className="outfit-list__title">搭配清单</Text>
            <View className="outfit-list__edit" onClick={handleEditOutfit}>
              <Text className="outfit-list__edit-text">修改搭配</Text>
              <Edit size={14} color="var(--nutui-brand-6)" />
            </View>
          </View>
          <View className="outfit-list__grid">
            {OUTFIT_PIECES.map((piece) => (
              <View
                key={piece.id}
                className="outfit-piece"
                hoverClass="outfit-piece--pressed"
                hoverStartTime={0}
                hoverStayTime={100}
              >
                <View className="outfit-piece__image-wrap">
                  <Image
                    className="outfit-piece__image"
                    src={piece.image}
                    mode="aspectFill"
                  />
                </View>
                <View className="outfit-piece__body">
                  <Text className="outfit-piece__category">{piece.category}</Text>
                  <Text className="outfit-piece__name">{piece.name}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="outfit-tips">
          <Text className="outfit-tips__title">搭配小贴士</Text>
          <View className="outfit-tips__tags">
            {OUTFIT_TIPS.map((tip) => (
              <View key={tip.id} className="outfit-tips__tag">
                <Text className="outfit-tips__tag-icon">{tip.icon}</Text>
                <Text className="outfit-tips__tag-text">{tip.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="wear-btn-wrap">
          <View className="wear-btn" onClick={handleWearOutfit}>
            <Text className="wear-btn__text">就穿这一身</Text>
          </View>
        </View>
      </Main.Scroll>
    </Main>
  );
}

export default TryOnPage;
