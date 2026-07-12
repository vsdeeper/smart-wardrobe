import { useCallback, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { ArrowRight, Edit } from "@nutui/icons-react-taro";
import { Image, Loading } from "@nutui/nutui-react-taro";
import DefaultAvatar from "@/components/DefaultAvatar";
import RecognitionBatchCard from "@/components/RecognitionBatchCard";
import {
  canOpenRecognitionBatch,
  MINE_RECOGNITION_PREVIEW_LIMIT,
  type RecognitionBatch,
} from "@/data/recognition";
import { MINE_DIARY_PREVIEW_LIMIT } from "@/data/tryOn";
import {
  formatHeightLabel,
  formatWeightLabel,
  getUserDisplayName,
  isMetricsSet,
} from "@/data/profile";
import { useMainTabNavigation } from "@/hooks/useMainTabNavigation";
import { useMineStatsActions } from "@/hooks/useMineStatsActions";
import { useRecognitionBatches } from "@/hooks/useRecognitionBatches";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useVisualDiary } from "@/hooks/useVisualDiary";
import Main from "@/layouts/Main";
import { formatDateTime } from "@/utils/formatDateTime";
import { normalizeRecognitionErrorMessage } from "@/utils/recognition";
import "./index.scss";

const ICON_PRIMARY = "var(--nutui-brand-6)";

type DiaryLayout = "grid" | "list";

function MinePage() {
  const { activeTab, onTabChange } = useMainTabNavigation(3);
  const [diaryLayout, setDiaryLayout] = useState<DiaryLayout>("list");
  const { profile, avatarUrl, itemCount, loading: profileLoading, onAvatarLoadError } =
    useUserProfile();
  const { entries, totalCount, loading: diaryLoading } = useVisualDiary({
    previewLimit: MINE_DIARY_PREVIEW_LIMIT,
  });
  const {
    batches,
    totalCount: recognitionTotal,
    loading: recognitionLoading,
  } = useRecognitionBatches({
    previewLimit: MINE_RECOGNITION_PREVIEW_LIMIT,
  });
  const { handleStatClick } = useMineStatsActions();

  const handleOpenProfile = () => {
    Taro.navigateTo({ url: "/pages/mine-profile/index" });
  };

  const handleOpenDiaryList = useCallback(() => {
    Taro.navigateTo({ url: "/pages/visual-diary/index" });
  }, []);

  const handleOpenDiaryDetail = useCallback((entryId?: string) => {
    if (!entryId) return;
    Taro.navigateTo({ url: `/pages/visual-diary-detail/index?id=${entryId}` });
  }, []);

  const handleOpenRecognitionHistory = useCallback(() => {
    Taro.navigateTo({ url: "/pages/recognition-history/index" });
  }, []);

  const handleOpenRecognitionBatch = useCallback((batch: RecognitionBatch) => {
    if (batch.status === "processing") {
      Taro.showToast({ title: "识别中，请稍候", icon: "none" });
      return;
    }
    if (batch.status === "failed") {
      Taro.showToast({
        title: normalizeRecognitionErrorMessage(batch.errorMessage),
        icon: "none",
      });
      return;
    }
    if (!canOpenRecognitionBatch(batch)) return;
    Taro.navigateTo({
      url: `/pages/ai-recognition/index?batchId=${batch._id}`,
    });
  }, []);

  const handleToggleDiaryLayout = () => {
    setDiaryLayout((prev) => (prev === "grid" ? "list" : "grid"));
  };

  const diaryToggleIcon =
    diaryLayout === "list" ? "icon-list" : "icon-category";

  const stats = [
    { key: "height", label: "身高", value: formatHeightLabel(profile.heightCm), iconClass: "icon-height" },
    { key: "weight", label: "体重", value: formatWeightLabel(profile.weightKg), iconClass: "icon-weight" },
    { key: "items", label: "单品", value: String(itemCount), iconClass: "icon-wardrobe" },
    { key: "outfits", label: "搭配", value: String(totalCount), iconClass: "icon-like" },
  ];

  const showDiaryViewAll = totalCount > MINE_DIARY_PREVIEW_LIMIT;
  const showRecognitionViewAll =
    recognitionTotal > MINE_RECOGNITION_PREVIEW_LIMIT;

  return (
    <Main
      activeTab={activeTab}
      onTabChange={onTabChange}
      scrollClassName="main-scroll--mine"
    >
      <Main.Scroll>
        <View className="mine">
          <View className="mine-header">
            <View className="mine-avatar" onClick={handleOpenProfile}>
              <View className="mine-avatar__ring">
                <DefaultAvatar
                  size="lg"
                  src={avatarUrl}
                  onLoadError={onAvatarLoadError}
                />
              </View>
              <View className="mine-avatar__edit">
                <Edit color="var(--sw-color-on-primary)" size={18} />
              </View>
            </View>
            <Text className="mine-header__name">
              {getUserDisplayName(profile)}
            </Text>
            <Text className="mine-header__bio">
              {profile.occupation && isMetricsSet(profile)
                ? `${profile.occupation} · ${profile.heightCm}cm / ${profile.weightKg}kg`
                : "完善个人画像，获得更精准的 AI 穿搭推荐。"}
            </Text>
          </View>

          <View className="mine-stats">
            {stats.map((stat) => (
              <View
                key={stat.key}
                className="mine-stat card"
                onClick={() => handleStatClick(stat.key)}
              >
                <Text
                  className={`iconfont ${stat.iconClass} mine-stat__icon`}
                />
                <Text className="mine-stat__label">{stat.label}</Text>
                <Text className="mine-stat__value">
                  {(profileLoading &&
                    (stat.key === "height" || stat.key === "weight")) ||
                  (diaryLoading && stat.key === "outfits")
                    ? "…"
                    : stat.value}
                </Text>
              </View>
            ))}
          </View>

          <View className="mine-section mine-section--recognition">
            <View className="mine-section__head">
              <Text className="mine-section__title">衣物识别</Text>
              <View className="mine-section__head-actions">
                {showRecognitionViewAll ? (
                  <View
                    className="mine-section__action"
                    onClick={handleOpenRecognitionHistory}
                  >
                    <Text className="mine-section__action-text">查看全部</Text>
                    <ArrowRight color={ICON_PRIMARY} size={14} />
                  </View>
                ) : null}
              </View>
            </View>
            {recognitionLoading ? (
              <View className="mine-diary-loading">
                <Loading type="circular" />
              </View>
            ) : batches.length === 0 ? (
              <View className="mine-diary-empty">
                <Text className="mine-diary-empty__title">还没有识别记录</Text>
                <Text className="mine-diary-empty__desc">
                  在衣橱上传衣物照片后，识别进度与历史会出现在这里
                </Text>
              </View>
            ) : (
              <View className="mine-recognition-list">
                {batches.map((batch) => (
                  <RecognitionBatchCard
                    key={batch._id}
                    batch={batch}
                    onClick={handleOpenRecognitionBatch}
                  />
                ))}
              </View>
            )}
          </View>

          <View className="mine-section mine-section--diary">
            <View className="mine-section__head">
              <Text className="mine-section__title">视觉日记</Text>
              <View className="mine-section__head-actions">
                {showDiaryViewAll ? (
                  <View
                    className="mine-section__action"
                    onClick={handleOpenDiaryList}
                  >
                    <Text className="mine-section__action-text">查看全部</Text>
                    <ArrowRight color={ICON_PRIMARY} size={14} />
                  </View>
                ) : null}
                <View
                  className="mine-diary-toggle"
                  onClick={handleToggleDiaryLayout}
                >
                  <Text
                    className={`iconfont ${diaryToggleIcon} mine-diary-toggle__icon`}
                  />
                </View>
              </View>
            </View>
            {diaryLoading ? (
              <View className="mine-diary-loading">
                <Loading type="circular" />
              </View>
            ) : entries.length === 0 ? (
              <View className="mine-diary-empty">
                <Text className="mine-diary-empty__title">还没有穿搭记录</Text>
                <Text className="mine-diary-empty__desc">
                  试穿后点击「就穿这一身」，记录将出现在这里
                </Text>
              </View>
            ) : diaryLayout === "grid" ? (
              <View className="mine-diary">
                {entries.map((entry) => (
                  <View
                    key={entry._id}
                    className="mine-diary__item"
                    onClick={() => handleOpenDiaryDetail(entry._id)}
                  >
                    <Image
                      className="mine-diary__image"
                      src={entry.coverUrl || entry.coverFileId || ""}
                      mode="aspectFit"
                      radius="0"
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View className="mine-diary mine-diary--list">
                {entries.map((entry) => (
                  <View
                    key={entry._id}
                    className="mine-diary-row card"
                    onClick={() => handleOpenDiaryDetail(entry._id)}
                  >
                    <View className="mine-diary-row__media">
                      <Image
                        className="mine-diary-row__image"
                        src={entry.coverUrl || entry.coverFileId || ""}
                        mode="aspectFit"
                        radius="0"
                      />
                    </View>
                    <View className="mine-diary-row__body">
                      <View className="mine-diary-row__head">
                        <Text className="mine-diary-row__title">
                          {entry.title}
                        </Text>
                        <Text className="mine-diary-row__time">
                          {formatDateTime(entry.createdAt)}
                        </Text>
                      </View>
                      <Text className="mine-diary-row__desc">
                        {entry.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Main.Scroll>
    </Main>
  );
}

export default MinePage;
