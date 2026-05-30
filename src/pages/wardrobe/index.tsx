import { useState } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Add } from "@nutui/icons-react-taro";
import {
  NavBar,
  Avatar,
  Progress,
  Tabs,
  Tag,
  Image,
  Tabbar,
} from "@nutui/nutui-react-taro";
import magicWandIcon from "@/assets/icons/magic-wand.svg";
import magicWandLargeIcon from "@/assets/icons/magic-wand-large.svg";
import "./index.scss";

/** 季节筛选 */
const SEASONS = ["春季", "夏季", "秋季", "冬季"];

/** 衣橱单品数据 */
interface WardrobeItem {
  id: number;
  name: string;
  category: string;
  image: string;
  tags?: string[];
  layout?: "large" | "wide";
  badge?: string;
}

const WARDROBE_ITEMS: WardrobeItem[] = [
  {
    id: 1,
    name: "高级羊绒大衣",
    category: "外套",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBw3Rt1LTR0iAus-pSvKJmmYMaa3JYqAWnhZniCfKtRIdTxgC7juZkWot5ARP89TL4Ky6WU_G7L6wzAriFkwHEeb5wlQFJkZFryzSnF1-yFBAi3kREEqsiwhMfzne18MOXf3mqn6ZiOR3C4yCRWcpJVfltGUjTFWPSLAI9q_ER4P3ajRk3ImutzpNM5YS27qD9MSUpBX61-KL6hA3ZOJ-NnrTRYvJpsjSZKEtpyvms_PN2tTLGfmmlry8dOOIkfjkYTP1IFdRlTvOf4",
    tags: ["羊毛", "米色"],
    layout: "large",
    badge: "可持续材质",
  },
  {
    id: 2,
    name: "基础 T 恤",
    category: "基础款",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCAF4s9JVyh6Q3vlcP3wPxo0gwLy_RxkOg6E8JZUSGxP68tvj48Ioik1gO0aB8VZQlE0_zbygPGjudWlGflBxPyPraqxTn2idBEek0FyXMd7ARPGZi7_H3MysGLIQdHahL4BBdRyPzm5C6JOh3ijHe76hAT5YhxKmKIvu2UQRXW4wHra50z6sOD82uV05IsAtrX5xMjgqVhYzCMTzuKQFvtHhV4YAPEdHJoP0N8dhqt0TcAJox1tjv2wX4jjYv7Gud5g301Aoy1xd_6",
    tags: ["深色"],
  },
  {
    id: 3,
    name: "休闲牛仔裤",
    category: "丹宁",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD1fNe-82aDDhEx7bXwRQP-5plPuDic6nDBcHJebtYQE_L5JZRD8qlbQInmYMrSQ4-yPcT1TJOUgZ96WNmW3GUxncjssg8B7vrSH3TA_Okj2WdGtLDnlSpF8PZU4iMxMI5WQRSDfoyAI-ohMI1_AazahB0yHCOF2gGh7j-g45S07C_D2NcyFFij-LFl8HBAPz3TxycIbQ8IuQ44XIz6sLxujFHCbW_WigkUQmjJ3dicABQx-R7Dwcv3WIwNHnsQsqMetxZW1-jd4Hus",
  },
  {
    id: 4,
    name: "切尔西靴",
    category: "鞋履",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD2OVRhA4s2VaolG2KDLqjCPsWOJLSP9cl_BWgCen-Xy3Pla0JdPwEfvqIplLOYv_Vkw5lhbDJLwjOpijwK_23pVFSdJ3SN-N6IdKfeoUcCMD7X2tqzhkixHYmPrgJS4K4iGk-xusshKDVTLBOzZm4waYh9VF2pM14QkaR8qTBtUB4vYfktqqvEMJMSVrhVfOq109Ds3UUN8VkaKzXFOo3M81QkMhE5XwmCNUdWMcIm5Zbv6oMVa557Sf1pYSkIORKi8tX8G3pDnGPy",
    layout: "wide",
  },
];

/** 底部导航 — 对齐设计稿 */
const BOTTOM_TABS = [
  { key: "wardrobe", label: "衣橱", icon: "👔" },
  { key: "outfit", label: "穿搭", icon: "🧥" },
  { key: "discover", label: "发现", icon: "🧭" },
  { key: "profile", label: "我的", icon: "👤" },
];

function WardrobeItemCard({ item }: { item: WardrobeItem }) {
  const isLarge = item.layout === "large";
  const isWide = item.layout === "wide";

  return (
    <View
      className={[
        "wardrobe-card",
        isLarge && "wardrobe-card--large",
        isWide && "wardrobe-card--wide",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <View className="wardrobe-card__inner">
        <View
          className={[
            "wardrobe-card__image-wrap",
            isLarge && "wardrobe-card__image-wrap--large",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Image
            className="wardrobe-card__image"
            src={item.image}
            mode="aspectFill"
            radius="0"
          />
          {item.badge && (
            <View className="wardrobe-card__badge">
              <Text className="wardrobe-card__badge-icon">🌿</Text>
              <Text className="wardrobe-card__badge-text">{item.badge}</Text>
            </View>
          )}
        </View>
        <View className="wardrobe-card__body">
          <Text className="wardrobe-card__category">{item.category}</Text>
          <Text
            className={[
              "wardrobe-card__name",
              isLarge && "wardrobe-card__name--large",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {item.name}
          </Text>
          {item.tags && item.tags.length > 0 && (
            <View className="wardrobe-card__tags">
              {item.tags.map((tag) => (
                <Tag
                  key={tag}
                  round
                  className="wardrobe-card__tag"
                  background="var(--sw-color-tag-bg)"
                  color="var(--sw-color-tag-text)"
                >
                  {tag}
                </Tag>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function WardrobePage() {
  const [activeSeason, setActiveSeason] = useState(2);
  const [activeTab, setActiveTab] = useState(0);

  const handleAddItem = () => {
    Taro.showToast({ title: "添加单品", icon: "none" });
  };

  const handleAIStyling = () => {
    Taro.showToast({ title: "AI 正在搭配中...", icon: "none" });
  };

  const { statusBarHeight, screenHeight, safeArea } = Taro.getWindowInfo();
  const safeAreaBottom = safeArea ? screenHeight - safeArea.bottom : 0;

  return (
    <View
      className="wardrobe-page"
      style={{
        ["--sw-status-bar-height" as string]: `${statusBarHeight ?? 0}px`,
        ["--sw-safe-area-bottom" as string]: `${safeAreaBottom}px`,
      }}
    >
      <NavBar
        safeAreaInsetTop
        className="wardrobe-navbar"
        left={
          <View className="navbar-brand">
            <Avatar
              size="small"
              className="navbar-brand__avatar"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmCTpivEznOkTWFXT6ny24Bt4QwsEslThRHoTF3RkrALjTbgZzGbpc3V4flHjljeuTvq5i5QxaIPMlmb0G9_TPT9f2I7BnbDvqnKqxOPoIHy0OAz3Ls3GXUEr6WhvsA0UxKDzFSA29uUCV7Zma7f3z96lapYURF8Kezt-f2_g0aGCyv9IB-K3kT6fSorQ0xb9YZahQP04u65Zl6HSNso_PXGEickO2pOsnanBzx2QAS6lqBmwXC5c7OAnvagtGtCxfrLx7u2V3HQe-"
            />
            <Text className="navbar-brand__title">Botanica</Text>
          </View>
        }
      />

      <ScrollView
        className="wardrobe-main"
        scrollY
        enhanced
        showScrollbar={false}
      >
        <View className="ai-status">
          <View className="ai-status__content">
            <View className="ai-status__icon-wrap">
              <Image
                className="ai-status__icon"
                src={magicWandIcon}
                mode="aspectFit"
              />
            </View>
            <View className="ai-status__text">
              <Text className="ai-status__label">AI 智能分类</Text>
              <Text className="ai-status__desc">正在扫描 12 件新单品...</Text>
            </View>
          </View>
          <Progress
            percent={70}
            className="ai-status__progress"
            color="var(--sw-color-accent)"
            background="var(--sw-color-progress-track)"
            showText={false}
          />
        </View>

        <View className="page-header">
          <Text className="page-header__title">个人衣橱</Text>
          <Tabs
            value={activeSeason}
            activeType="button"
            className="season-tabs"
            onChange={(v) => setActiveSeason(v as number)}
          >
            {SEASONS.map((season, idx) => (
              <Tabs.TabPane key={season} title={season} value={idx} />
            ))}
          </Tabs>
        </View>

        <View className="wardrobe-grid">
          {WARDROBE_ITEMS.map((item) => (
            <WardrobeItemCard key={item.id} item={item} />
          ))}

          <View className="wardrobe-card wardrobe-card--cta">
            <View className="wardrobe-cta">
              <View className="wardrobe-cta__pattern" aria-hidden>
                <Image
                  className="wardrobe-cta__pattern-icon"
                  src={magicWandLargeIcon}
                  mode="aspectFit"
                />
              </View>
              <View className="wardrobe-cta__content">
                <Text className="wardrobe-cta__title">需要搭配建议吗？</Text>
                <Text className="wardrobe-cta__desc">
                  AI 已根据您的秋季收藏为您准备了 5 套全新搭配。
                </Text>
                <View className="wardrobe-cta__btn" onClick={handleAIStyling}>
                  <Text className="wardrobe-cta__btn-text">开始搭配</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="wardrobe-fab" onClick={handleAddItem}>
        <Add className="wardrobe-fab__icon" color="#ffffff" size={30} />
      </View>

      <Tabbar
        fixed
        safeArea
        value={activeTab}
        activeColor="var(--nutui-brand-6)"
        inactiveColor="var(--nutui-gray-5)"
        className="wardrobe-tabbar"
        onSwitch={(v) => setActiveTab(v as number)}
      >
        {BOTTOM_TABS.map((tab, idx) => (
          <Tabbar.Item
            key={tab.key}
            title={tab.label}
            value={idx}
            icon={<Text className="tabbar-icon">{tab.icon}</Text>}
          />
        ))}
      </Tabbar>
    </View>
  );
}

export default WardrobePage;
