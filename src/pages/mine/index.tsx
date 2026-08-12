import { canOpenRecognitionBatch } from "@/utils/recognition-batch";
import { MINE_RECOGNITION_PREVIEW_LIMIT } from "@/constants/recognition";
import { type RecognitionBatch } from "@/types/recognition";
import { MINE_DIARY_PREVIEW_LIMIT } from "@/constants/try-on";
import { getUserDisplayName } from "@/utils/profile";
import { useCallback, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { ArrowRight, Setting } from "@nutui/icons-react-taro";
import { Image } from "@nutui/nutui-react-taro";
import DefaultAvatar from "@/components/DefaultAvatar";
import MediaListCard from "@/components/MediaListCard";
import PageLoading from "@/components/PageLoading";
import RecognitionBatchCard from "@/components/RecognitionBatchCard";



import { useMainTabNavigation } from "@/hooks/use-main-tab-navigation";
import { useRecognitionBatches } from "@/hooks/use-recognition-batches";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useVisualDiary } from "@/hooks/use-visual-diary";
import Main from "@/layouts/Main";
import { formatDateTime } from "@/utils/format-date-time";
import { normalizeRecognitionErrorMessage } from "@/utils/recognition";
import "./index.scss";

const ICON_PRIMARY = "var(--nutui-brand-6)";

type DiaryLayout = "grid" | "list";

function MinePage() {
  const { activeTab, onTabChange } = useMainTabNavigation(3);
  const [diaryLayout, setDiaryLayout] = useState<DiaryLayout>("grid");
  const { profile, avatarUrl, onAvatarLoadError } = useUserProfile();
  const {
    entries,
    totalCount,
    loading: diaryLoading,
  } = useVisualDiary({
    previewLimit: MINE_DIARY_PREVIEW_LIMIT,
  });
  const {
    batches,
    totalCount: recognitionTotal,
    loading: recognitionLoading,
  } = useRecognitionBatches({
    previewLimit: MINE_RECOGNITION_PREVIEW_LIMIT,
  });
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

  const showDiaryViewAll = totalCount > MINE_DIARY_PREVIEW_LIMIT;
  const showRecognitionViewAll =
    recognitionTotal > MINE_RECOGNITION_PREVIEW_LIMIT;

  const handleOpenAbout = useCallback(() => {
    Taro.navigateTo({ url: "/pages/about/index" });
  }, []);

  const handleOpenCredits = useCallback(() => {
    Taro.navigateTo({ url: "/pages/credits-pricing/index" });
  }, []);

  return (
    <Main
      activeTab={activeTab}
      onTabChange={onTabChange}
      scrollClassName="main-scroll--mine"
    >
      <Main.Scroll>
        <View className="mine">
          <View className="mine-header">
            <View className="mine-avatar">
              <View className="mine-avatar__ring">
                <DefaultAvatar
                  size="lg"
                  src={avatarUrl}
                  onLoadError={onAvatarLoadError}
                />
              </View>
              <View className="mine-avatar__edit" onClick={handleOpenProfile}>
                <Setting color="var(--nutui-color-primary-text)" size={18} />
              </View>
            </View>
            <Text className="mine-header__name">
              {getUserDisplayName(profile)}
            </Text>
            <View className="mine-header__credits" onClick={handleOpenCredits}>
              <Text className="mine-header__credits-balance">积分 0</Text>
              <Text className="mine-header__credits-action">充值</Text>
            </View>
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
                    <Text className="mine-section__action-text">更多</Text>
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
              <PageLoading text="" />
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
                  <MediaListCard
                    key={entry._id}
                    imageSrc={entry.coverUrl || entry.coverFileId || undefined}
                    title={entry.title}
                    time={formatDateTime(entry.createdAt)}
                    description={entry.description}
                    onClick={() => handleOpenDiaryDetail(entry._id)}
                  />
                ))}
              </View>
            )}
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
                    <Text className="mine-section__action-text">更多</Text>
                    <ArrowRight color={ICON_PRIMARY} size={14} />
                  </View>
                ) : null}
              </View>
            </View>
            {recognitionLoading ? (
              <PageLoading text="" />
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

          <View className="mine-about-link" onClick={handleOpenAbout}>
            <Text className="mine-about-link__text">关于凡衣橱</Text>
          </View>
        </View>
      </Main.Scroll>
    </Main>
  );
}

export default MinePage;
