import { useCallback, useMemo, useRef, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { Add } from "@nutui/icons-react-taro";
import { Loading, Progress, Tabs, Tag, Image } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import Main from "@/layouts/Main";
import type { ClothingType, WardrobeItem } from "@/data/wardrobe";
import { WARDROBE_PAGE_SIZE } from "@/data/wardrobe";
import {
  fetchClothingTypes,
  fetchWardrobeItemCount,
  fetchWardrobeItems,
  uploadAndRecognize,
} from "@/services/wardrobe";
import { getCardLayout } from "@/utils/wardrobeLayout";
import { useMainTabNavigation } from "@/utils/tabNavigation";
import "./index.scss";

type AiPhase = "idle" | "uploading" | "recognizing" | "done";

interface AiStatus {
  phase: AiPhase;
  progress: number;
  totalCount: number;
}

interface WardrobeItemCardProps {
  item: WardrobeItem;
  layout?: "large" | "wide";
}

function WardrobeItemCard({ item, layout }: WardrobeItemCardProps) {
  const isLarge = layout === "large";
  const isWide = layout === "wide";

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
            src={item.imageUrl || item.imageFileId}
            mode="aspectFill"
            radius="0"
          />
        </View>
        <View className="wardrobe-card__body">
          <Text className="wardrobe-card__category">{item.typeName}</Text>
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
  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>([]);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus>({
    phase: "idle",
    progress: 0,
    totalCount: 0,
  });

  const loadingRef = useRef(false);
  const itemsRef = useRef<WardrobeItem[]>([]);
  itemsRef.current = items;
  const { activeTab: mainTab, onTabChange } = useMainTabNavigation(0);

  const activeTypeId = useMemo(() => {
    if (activeTab === 0) return null;
    return clothingTypes[activeTab - 1]?._id ?? null;
  }, [activeTab, clothingTypes]);

  const tabTitles = useMemo(
    () =>
      clothingTypes.length > 0
        ? ["全部", ...clothingTypes.map((type) => type.name)]
        : [],
    [clothingTypes],
  );

  const loadTypes = useCallback(async () => {
    const types = await fetchClothingTypes();
    setClothingTypes(types);
    return types;
  }, []);

  const loadItems = useCallback(
    async (options: { reset?: boolean; typeId?: string | null } = {}) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      const reset = options.reset ?? false;
      const typeId =
        options.typeId !== undefined ? options.typeId : activeTypeId;

      if (reset) {
        setInitialLoading(true);
      } else {
        setListLoading(true);
      }

      try {
        const skip = reset ? 0 : itemsRef.current.length;
        const nextItems = await fetchWardrobeItems({
          typeId,
          skip: reset ? 0 : skip,
          limit: WARDROBE_PAGE_SIZE,
        });

        setItems((prev) => (reset ? nextItems : [...prev, ...nextItems]));
        setHasMore(nextItems.length >= WARDROBE_PAGE_SIZE);
      } catch (err) {
        const message = err instanceof Error ? err.message : "加载失败";
        Taro.showToast({ title: message, icon: "none" });
      } finally {
        loadingRef.current = false;
        setListLoading(false);
        setInitialLoading(false);
      }
    },
    [activeTypeId],
  );

  const refreshWardrobe = useCallback(async () => {
    try {
      const [totalCount] = await Promise.all([
        fetchWardrobeItemCount(),
        loadTypes(),
      ]);
      setAiStatus((prev) => ({ ...prev, totalCount, phase: "idle" }));
      await loadItems({ reset: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载失败";
      Taro.showToast({ title: message, icon: "none" });
      setInitialLoading(false);
    }
  }, [loadItems, loadTypes]);

  useDidShow(() => {
    if (process.env.TARO_ENV !== "weapp") {
      setInitialLoading(false);
      return;
    }
    refreshWardrobe();
  });

  const handleTypeChange = async (value: string | number) => {
    const nextTab = value as number;
    setActiveTab(nextTab);
    setItems([]);
    setHasMore(true);

    const typeId =
      nextTab === 0 ? null : (clothingTypes[nextTab - 1]?._id ?? null);
    loadingRef.current = false;
    await loadItems({ reset: true, typeId });
  };

  const handleAddItem = async () => {
    if (process.env.TARO_ENV !== "weapp") {
      Taro.showToast({ title: "请在微信小程序中使用", icon: "none" });
      return;
    }
    if (adding) return;

    try {
      const chooseRes = await Taro.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
      });
      const filePath = chooseRes.tempFiles[0]?.tempFilePath;
      if (!filePath) return;

      setAdding(true);
      setAiStatus((prev) => ({
        ...prev,
        phase: "uploading",
        progress: 30,
      }));

      setAiStatus((prev) => ({
        ...prev,
        phase: "recognizing",
        progress: 70,
      }));

      const result = await uploadAndRecognize(filePath);

      setAiStatus((prev) => ({
        ...prev,
        phase: "done",
        progress: 100,
        totalCount: prev.totalCount + 1,
      }));

      await loadTypes();

      if (activeTypeId === null || activeTypeId === result.item.typeId) {
        setItems((prev) => [result.item, ...prev]);
      }

      Taro.showToast({ title: "识别成功", icon: "success" });

      setTimeout(() => {
        setAiStatus((prev) => ({ ...prev, phase: "idle", progress: 0 }));
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "识别失败";
      Taro.showToast({ title: message, icon: "none" });
      setAiStatus((prev) => ({ ...prev, phase: "idle", progress: 0 }));
    } finally {
      setAdding(false);
    }
  };

  const handleScrollToLower = () => {
    if (!hasMore || listLoading || initialLoading || loadingRef.current) return;
    loadItems();
  };

  const handleAIStyling = () => {
    Taro.showToast({ title: "AI 正在搭配中...", icon: "none" });
  };

  const aiStatusDesc = useMemo(() => {
    switch (aiStatus.phase) {
      case "uploading":
        return "正在上传图片...";
      case "recognizing":
        return "AI 正在识别衣物类型...";
      case "done":
        return "分类完成";
      default:
        return aiStatus.totalCount > 0
          ? `已分类 ${aiStatus.totalCount} 件单品`
          : "上传衣物照片，AI 将自动识别分类";
    }
  }, [aiStatus]);

  const showProgress = aiStatus.phase !== "idle";

  return (
    <Main activeTab={mainTab} onTabChange={onTabChange} header={<AppNavbar />}>
      <Main.Scroll lowerThreshold={120} onScrollToLower={handleScrollToLower}>
        <View className="ai-status">
          <View className="ai-status__content">
            <View className="ai-status__icon-wrap">
              <Text className="iconfont icon-magic-wand ai-status__icon" />
            </View>
            <View className="ai-status__text">
              <Text className="ai-status__label">AI 智能分类</Text>
              <Text className="ai-status__desc">{aiStatusDesc}</Text>
            </View>
          </View>
          {showProgress && (
            <Progress
              percent={aiStatus.progress}
              className="ai-status__progress"
              color="var(--sw-color-accent)"
              background="var(--sw-color-progress-track)"
              showText={false}
            />
          )}
        </View>

        <View className="page-header">
          <Text className="page-header__title">个人衣橱</Text>
          <Tabs
            value={activeTab}
            activeType="button"
            className="type-tabs"
            onChange={handleTypeChange}
          >
            {tabTitles.map((title, idx) => (
              <Tabs.TabPane key={title} title={title} value={idx} />
            ))}
          </Tabs>
        </View>

        {initialLoading ? (
          <View className="wardrobe-loading">
            <Loading type="circular" />
            <Text className="wardrobe-loading__text">加载中...</Text>
          </View>
        ) : items.length === 0 ? (
          <View className="wardrobe-empty">
            <Text className="wardrobe-empty__title">衣橱还是空的</Text>
            <Text className="wardrobe-empty__desc">
              点击右下角按钮上传衣物照片，AI 将自动识别并分类
            </Text>
          </View>
        ) : (
          <View className="wardrobe-grid">
            {items.map((item, index) => (
              <WardrobeItemCard
                key={item._id}
                item={item}
                layout={getCardLayout(index, items.length)}
              />
            ))}

            <View className="wardrobe-card wardrobe-card--cta">
              <View className="wardrobe-cta">
                <View className="wardrobe-cta__pattern" aria-hidden>
                  <Text className="iconfont icon-magic-wand wardrobe-cta__pattern-icon" />
                </View>
                <View className="wardrobe-cta__content">
                  <Text className="wardrobe-cta__title">需要搭配建议吗？</Text>
                  <Text className="wardrobe-cta__desc">
                    AI 已根据您的收藏为您准备了全新搭配。
                  </Text>
                  <View className="wardrobe-cta__btn" onClick={handleAIStyling}>
                    <Text className="wardrobe-cta__btn-text">开始搭配</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {listLoading && items.length > 0 && (
          <View className="wardrobe-load-more">
            <Loading type="circular" />
            <Text className="wardrobe-load-more__text">加载更多...</Text>
          </View>
        )}
      </Main.Scroll>

      <View
        className={["wardrobe-fab", adding && "wardrobe-fab--disabled"]
          .filter(Boolean)
          .join(" ")}
        onClick={handleAddItem}
      >
        <Add className="wardrobe-fab__icon" color="#ffffff" size={30} />
      </View>
    </Main>
  );
}

export default WardrobePage;
