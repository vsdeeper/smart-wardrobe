import { useState, useEffect } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import {
  NavBar,
  Avatar,
  Progress,
  Tabs,
  Tag,
  Image,
  Button,
  Tabbar,
} from "@nutui/nutui-react-taro";
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
  large?: boolean;
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
    large: true,
    badge: "可持续材质",
  },
  {
    id: 2,
    name: "基础T恤",
    category: "基础款",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCAF4s9JVyh6Q3vlcP3wPxo0gwLy_RxkOg6E8JZUSGxP68tvj48Ioik1gO0aB8VZQlE0_zbygPGjudWlGflBxPyPraqxTn2idBEek0FyXMd7ARPGZi7_H3MysGLIQdHahL4BBdRyPzm5C6JOh3ijHe76hAT5YhxKmKIvu2UQRXW4wHra50z6sOD82uV05IsAtrX5xMjgqVhYzCMTzuKQFvtHhV4YAPEdHJoP0N8dhqt0TcAJox1tjv2wX4jjYv7Gud5g301Aoy1xd_6",
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
  },
];

/** 底部导航 */
const BOTTOM_TABS = [
  { key: "wardrobe", label: "衣橱", icon: "👔" },
  { key: "fitting", label: "试穿", icon: "👤" },
  { key: "styling", label: "搭配", icon: "✨" },
  { key: "profile", label: "我的", icon: "👤" },
];

function WardrobePage() {
  const [activeSeason, setActiveSeason] = useState(2); // 秋季
  const [activeTab, setActiveTab] = useState(0);

  const handleAddItem = () => {
    Taro.showToast({ title: "添加单品", icon: "none" });
  };

  const handleAIStyling = () => {
    Taro.showToast({ title: "AI 正在搭配中...", icon: "none" });
  };

  return (
    <View className="wardrobe-page">
      {/* ========== 顶部导航栏（NutUI NavBar） ========== */}
      <NavBar
        safeAreaInsetTop
        className="wardrobe-navbar"
        left={
          <View className="navbar-brand">
            <Avatar
              size="24"
              className="navbar-brand__avatar"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmCTpivEznOkTWFXT6ny24Bt4QwsEslThRHoTF3RkrALjTbgZzGbpc3V4flHjljeuTvq5i5QxaIPMlmb0G9_TPT9f2I7BnbDvqnKqxOPoIHy0OAz3Ls3GXUEr6WhvsA0UxKDzFSA29uUCV7Zma7f3z96lapYURF8Kezt-f2_g0aGCyv9IB-K3kT6fSorQ0xb9YZahQP04u65Zl6HSNso_PXGEickO2pOsnanBzx2QAS6lqBmwXC5c7OAnvagtGtCxfrLx7u2V3HQe-"
            />
            <Text className="navbar-brand__title">Botanica</Text>
          </View>
        }
      />

      {/* ========== 主内容区 ========== */}
      <ScrollView
        className="wardrobe-main"
        scrollY
        enhanced
        showScrollbar={false}
      >
        {/* AI 状态指示器（NutUI Progress） */}
        <View className="ai-status card">
          <View className="ai-status__content">
            <View className="ai-status__icon-wrap">
              <Text className="ai-status__icon">✨</Text>
            </View>
            <View className="ai-status__text">
              <Text className="ai-status__label">AI 智能分类</Text>
              <Text className="ai-status__desc">正在扫描 12 件新单品...</Text>
            </View>
          </View>
          <Progress
            percent={65}
            className="ai-status__progress"
            color="var(--nutui-brand-6)"
            background="var(--nutui-gray-2)"
            showText={false}
          />
        </View>

        {/* 页面标题 & 季节筛选（NutUI Tabs） */}
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

        {/* 衣橱网格（NutUI Image + Tag） */}
        <View className="wardrobe-grid">
          {/* 大卡片 - 特色单品 */}
          <View className="wardrobe-card wardrobe-card--large">
            <View className="wardrobe-card__inner card">
              <View className="wardrobe-card__image-wrap wardrobe-card__image-wrap--large">
                <Image
                  className="wardrobe-card__image"
                  src={WARDROBE_ITEMS[0].image}
                  mode="aspectFill"
                  radius="0"
                />
                {WARDROBE_ITEMS[0].badge && (
                  <View className="wardrobe-card__badge">
                    <Text className="wardrobe-card__badge-icon">🌿</Text>
                    <Text className="wardrobe-card__badge-text">
                      {WARDROBE_ITEMS[0].badge}
                    </Text>
                  </View>
                )}
              </View>
              <View className="wardrobe-card__body">
                <Text className="wardrobe-card__category">
                  {WARDROBE_ITEMS[0].category}
                </Text>
                <Text className="wardrobe-card__name">
                  {WARDROBE_ITEMS[0].name}
                </Text>
                {WARDROBE_ITEMS[0].tags && (
                  <View className="wardrobe-card__tags">
                    {WARDROBE_ITEMS[0].tags.map((tag) => (
                      <Tag
                        key={tag}
                        round
                        background="var(--nutui-gray-2)"
                        color="var(--nutui-gray-6)"
                      >
                        {tag}
                      </Tag>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* 标准卡片 */}
          {WARDROBE_ITEMS.slice(1).map((item) => (
            <View key={item.id} className="wardrobe-card">
              <View className="wardrobe-card__inner card">
                <View className="wardrobe-card__image-wrap">
                  <Image
                    className="wardrobe-card__image"
                    src={item.image}
                    mode="aspectFill"
                    radius="0"
                  />
                </View>
                <View className="wardrobe-card__body">
                  <Text className="wardrobe-card__category">
                    {item.category}
                  </Text>
                  <Text className="wardrobe-card__name">{item.name}</Text>
                </View>
              </View>
            </View>
          ))}

          {/* AI 搭配建议卡片（NutUI Button） */}
          <View className="wardrobe-card wardrobe-card--cta">
            <View className="wardrobe-cta">
              <View className="wardrobe-cta__content">
                <Text className="wardrobe-cta__title">需要搭配建议吗？</Text>
                <Text className="wardrobe-cta__desc">
                  AI 已根据您的秋季收藏为您准备了 5 套全新搭配。
                </Text>
                <Button
                  type="primary"
                  shape="round"
                  className="wardrobe-cta__btn"
                  onClick={handleAIStyling}
                  style={{ background: "#fff", color: "var(--nutui-brand-6)" }}
                >
                  开始搭配
                </Button>
              </View>
              <Text className="wardrobe-cta__decor">✨</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ========== 底部导航栏（NutUI Tabbar） ========== */}
      <Tabbar
        fixed
        safeArea
        value={activeTab}
        activeColor="var(--nutui-brand-7)"
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

      {/* ========== 悬浮添加按钮（NutUI Button） ========== */}
      <Button
        type="primary"
        shape="round"
        className="fab"
        onClick={handleAddItem}
        style={{
          background: "var(--nutui-brand-6)",
          boxShadow: "0 4px 16px rgba(123, 192, 67, 0.3)",
        }}
      >
        +
      </Button>
    </View>
  );
}

export default WardrobePage;
