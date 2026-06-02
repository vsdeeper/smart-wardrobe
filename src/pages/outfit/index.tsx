import { useMemo, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Add, Check } from "@nutui/icons-react-taro";
import { Image, Tabs } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import Main from "@/layouts/Main";
import { useMainTabNavigation } from "@/utils/tabNavigation";
import "./index.scss";

const CATEGORIES = ["上装", "下装", "外套", "鞋履", "配饰"] as const;
type OutfitCategory = (typeof CATEGORIES)[number];

/** 衣橱单品（搭配页） */
interface MatchItem {
  id: number;
  category: OutfitCategory;
  series: string;
  name: string;
  image: string;
}

const MATCH_ITEMS: MatchItem[] = [
  {
    id: 1,
    category: "上装",
    series: "夏日系列",
    name: "亚麻廓形西装",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC8ubkyXiWDxrhG-qODYrDHOBREC-PoUmZLZTvoK40qfngxOMqUgGUeqd-zrnzTrSXUIgAVS_skQ0-LvgyYtr58hTsVPJsA_9HjVbUMXyCnwUBMHTZ4LKw9iCoDJ5hG32-0ZMmxr7kbBp_6WdMjuzJIVy8k5uMLR0i2pBV1kSBvpFJu5tRmWD5wuRRkqvOIYYAfDzypI_zGpmQsEx0R8wI049kj_M9vTCx-ILaq13oFpARTbapJwUeKn3Rhvp_59MgGE-nOhgsNDe3W",
  },
  {
    id: 2,
    category: "上装",
    series: "基础款",
    name: "有机棉 T 恤",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBDxcldkGmEmspv2za5mbbfsr0josF_6OE9t_iOtqsZXA4muavpM6k9ma1OYY4AOhquyakAmLoL9C_BMV88gHX1xpjEiSwTajK3EOGascm5tZlmQOSOjuLgtfa74EHC99JgPrLsQkXhJdypZI4SoyjDG3zfwThom8_Lsz7qhaQFlxuIaQ6fOm3rI4vKxSm54Vq6APvQevwRV8xk4aEgFoQB41JIK9fzvBLt5YvU14Rj81lSCwwIW-TA5DonemYqQCwS4p8grnw05qVf",
  },
  {
    id: 3,
    category: "上装",
    series: "针织衫",
    name: "鼠尾草绿针织衫",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB6wVAeLraU0GI5MwPfSAFzQPO13R51Oa7hr2TIts4wpgT-im6tOVo-PCKR06COkzdoM0Hmk1K-W9ch6WKp3nnNZQqyZlRpx6MQ7u8uFiSRmAkT2k0C0zhXaC02Dj5z-R86OeWM1GqZWHHtjtEgOEEBlVyx_rJk-JI5ehoL5dJMtrbvXRo2y7WB5yWfmj7Hd5EtV60OXjxCvlWNOTlZL4qeV5wgTAw0ZonjirI5NwOujXoHSb3n_bLpzZZ-RbvqWefe-XZFNSO9Nt_Y",
  },
  {
    id: 4,
    category: "上装",
    series: "必备单品",
    name: "府绸经典衬衫",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD4aEVMUO4FpmaWLgUKlWLTMC-DYuTxWLHeNQwMgo75_zd4jYZvguLIFKbR8rtSQoawQKmL1sxURJm0T25deG3THoTXrS2GSC3-_cjKUWlgS5jBmO9bMg0m5lpokzFhNiNeKpFZND07VGLNB0rZZEX8ij8kfwwd2h2kCAJFXDw2ji8d6QmjHq6enj4DQaPAi_1eU2Km08wOQ1EkK4saqb6zQZlBrMvkRUeIxzD5zY5Uq0JoRewq1UotF_UMTSMhWvvqFxXsGcHbADDR",
  },
  {
    id: 5,
    category: "上装",
    series: "奢华系列",
    name: "丝绸乳白衬衫",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCsPRuwnV4e2qS3DeT43gpFAo1-lPfRApeMxybmv8y2SltejxzLQWjBO3DD3djUdK5dw4crlAOKpHd58rhLLwiY2uuFCVDoxdVMztLaVTGnd4z1v6auBBtN7pj7cvay-bxsM95F27v_YR95FGYKlPeNURO0Nm6NBQq9mJDtiC4EzGypYSRhW8H7oFKLSba3NpmRH3E2KUYRoBv7XvwRzIPp_4Umwpf0V9GEHTh1ui7ikqo14H4dWw0oUhtYBSW5OmZChGR4lSgZ1aEJ",
  },
  {
    id: 6,
    category: "外套",
    series: "外套",
    name: "廓形羊毛大衣",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDI0Zif4hXzRU2xfg1Q3B5Ae6x6z9tgIpbammigtN7YrJNb9Xmfb8LuYcjnbB5jOqPfH5PyWwi39zOzyz65rgQ33UZFdrhuYfhA3DnR4UwiNw2fFNpCRo7sSAWmtLK8BFFjec7YDTDqBjxsBllYfy7Afhw4FXV3kBeBZnBzmtmQplcpMEIijD3TL1QQSDoGC_xgyLe77nqkeDOQt-4IOth1DCyPG_eN8gTjHD9GPR3jEPNkO3jlSDQkWyae9TBS_XGCxmKZx-Dbs0l5",
  },
  {
    id: 7,
    category: "下装",
    series: "丹宁",
    name: "直筒浅蓝牛仔裤",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDkRnB8KADeo_JAHY1bCdeNnIpAjd7ITjxv5NHoT0lYKa6TZy-pxfb788mK-AtUm-7e3Ua_jBn5-IH6bJ6vO0PeSk0lsOrkOokKro0e1ia9EaqYpISyJMQRbazY9LIrDVe3PAqUEMJDLo2EaxIdONazB8SN1_R6HPrwWRebOk6jYGRbY3TrjlS-6bfRi-eazXYT8CZa1oS-AjrhWdPlGuQR7B937oLEDryM30CT7VpC6EIHL7W0fd0oE7uzTA58q27DcK9_Sv0mN3WP",
  },
  {
    id: 8,
    category: "鞋履",
    series: "基础款",
    name: "白色皮革运动鞋",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBm1uCRJ-1aamuqGeY0_k6CXS_Vetfc9v3u8ebH84m_SMWIy7oJSzpnDEFvwnMn8IE3cJYfLb4JpxcvH9ecIoP3LlyO0vA3QCtAQmWjdz50E-tITpasq4M2wU5IHGsfWQecN6bjPJtd1JJyqnRvoatxcb7uKPaPyQPD0o6dBZsEyEUnUBlSwImJ16Tk8-sxkK6FZMFZXqO6Xmv5rSkaWPDSw6IQ67UmBgzYzZDvg1SHV7xf4jhA5bvie5AeruSzSqHgYukejTVQIkbM",
  },
];

const OUTFIT_NAME = "早春清晨";

const INITIAL_OUTFIT_IDS = [1, 7, 8];

function MatchItemCard({
  item,
  selected,
  onToggle,
}: {
  item: MatchItem;
  selected: boolean;
  onToggle: (item: MatchItem) => void;
}) {
  return (
    <View
      className={["match-card", selected && "match-card--selected"]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onToggle(item)}
    >
      <View className="match-card__image-wrap">
        <Image
          className="match-card__image"
          src={item.image}
          mode="aspectFill"
          radius="0"
        />
        {selected && (
          <View className="match-card__check">
            <Check size={14} color="#ffffff" />
          </View>
        )}
      </View>
      <View className="match-card__body">
        <Text className="match-card__series">{item.series}</Text>
        <Text className="match-card__name">{item.name}</Text>
      </View>
    </View>
  );
}

function OutfitPage() {
  const { activeTab, onTabChange } = useMainTabNavigation(2);
  const [activeCategory, setActiveCategory] = useState<OutfitCategory>("上装");
  const [outfitByCategory, setOutfitByCategory] = useState<
    Partial<Record<OutfitCategory, MatchItem>>
  >(() => {
    const initial: Partial<Record<OutfitCategory, MatchItem>> = {};
    INITIAL_OUTFIT_IDS.forEach((id) => {
      const item = MATCH_ITEMS.find((m) => m.id === id);
      if (item) initial[item.category] = item;
    });
    return initial;
  });

  const activeCategoryIndex = CATEGORIES.indexOf(activeCategory);

  const filteredItems = useMemo(
    () => MATCH_ITEMS.filter((item) => item.category === activeCategory),
    [activeCategory],
  );

  const outfitPieces = useMemo(
    () =>
      CATEGORIES.map((cat) => outfitByCategory[cat]).filter(
        (item): item is MatchItem => Boolean(item),
      ),
    [outfitByCategory],
  );

  const handleToggleItem = (item: MatchItem) => {
    setOutfitByCategory((prev) => {
      const current = prev[item.category];
      if (current?.id === item.id) {
        const next = { ...prev };
        delete next[item.category];
        return next;
      }
      return { ...prev, [item.category]: item };
    });
  };

  const handleRemovePiece = (item: MatchItem) => {
    setOutfitByCategory((prev) => {
      const next = { ...prev };
      delete next[item.category];
      return next;
    });
  };

  const handleSaveOutfit = () => {
    if (outfitPieces.length === 0) {
      Taro.showToast({ title: "请先选择单品", icon: "none" });
      return;
    }
    Taro.showToast({ title: "搭配已保存", icon: "success" });
  };

  const handleAddPiece = () => {
    Taro.showToast({ title: "从上方列表选择单品", icon: "none" });
  };

  return (
    <Main
      activeTab={activeTab}
      onTabChange={onTabChange}
      scrollClassName="main-scroll--outfit"
      header={<AppNavbar />}
    >
      <Main.Scroll>
        <Tabs
          value={activeCategoryIndex}
          activeType="button"
          className="category-tabs"
          onChange={(v) => setActiveCategory(CATEGORIES[v as number])}
        >
          {CATEGORIES.map((cat, idx) => (
            <Tabs.TabPane key={cat} title={cat} value={idx} />
          ))}
        </Tabs>

        <View className="match-grid">
          {filteredItems.map((item) => (
            <MatchItemCard
              key={item.id}
              item={item}
              selected={outfitByCategory[item.category]?.id === item.id}
              onToggle={handleToggleItem}
            />
          ))}
        </View>
      </Main.Scroll>

      <View className="outfit-panel">
        <View className="outfit-panel__card">
          <View className="outfit-panel__header">
            <View className="outfit-panel__info">
              <Text className="outfit-panel__title">当前搭配</Text>
              <Text className="outfit-panel__desc">
                已选 {outfitPieces.length} 件单品 • 「{OUTFIT_NAME}」
              </Text>
            </View>
            <View className="outfit-panel__save" onClick={handleSaveOutfit}>
              <Text className="outfit-panel__save-text">保存搭配</Text>
            </View>
          </View>
          <View className="outfit-panel__thumbs">
            <View className="outfit-panel__thumbs-inner">
              {outfitPieces.map((piece) => (
                <View key={piece.id} className="outfit-thumb">
                  <View className="outfit-thumb__media">
                    <Image
                      className="outfit-thumb__image"
                      src={piece.image}
                      mode="aspectFill"
                    />
                  </View>
                  <View
                    className="outfit-thumb__remove"
                    onClick={() => handleRemovePiece(piece)}
                  >
                    <Text className="outfit-thumb__remove-icon">×</Text>
                  </View>
                </View>
              ))}
              <View className="outfit-thumb outfit-thumb--add" onClick={handleAddPiece}>
                <Add size={20} color="var(--nutui-gray-5)" />
                <Text className="outfit-thumb__add-label">添加单品</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Main>
  );
}

export default OutfitPage;
