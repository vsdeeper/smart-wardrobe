import { useCallback } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Loading, NavBar } from "@nutui/nutui-react-taro";
import RecognitionBatchCard from "@/components/RecognitionBatchCard";
import {
  canOpenRecognitionBatch,
  RECOGNITION_HISTORY_PAGE_SIZE,
  type RecognitionBatch,
} from "@/data/recognition";
import { useRecognitionBatches } from "@/hooks/useRecognitionBatches";
import { normalizeRecognitionErrorMessage } from "@/utils/recognition";
import "./index.scss";

function RecognitionHistoryPage() {
  const { batches, loading, listLoading, hasMore, loadMore } =
    useRecognitionBatches({
      pageSize: RECOGNITION_HISTORY_PAGE_SIZE,
      enablePagination: true,
    });

  const handleBack = useCallback(() => {
    Taro.navigateBack();
  }, []);

  const handleScrollToLower = useCallback(() => {
    if (!hasMore || listLoading || loading) return;
    void loadMore();
  }, [hasMore, listLoading, loading, loadMore]);

  const handleOpenBatch = useCallback((batch: RecognitionBatch) => {
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

  const { statusBarHeight, safeArea } = Taro.getWindowInfo();
  const safeAreaBottom = safeArea
    ? Taro.getWindowInfo().screenHeight - safeArea.bottom
    : 0;

  return (
    <View
      className="recognition-history-page"
      style={{
        ["--sw-status-bar-height" as string]: `${statusBarHeight ?? 0}px`,
        ["--sw-safe-area-bottom" as string]: `${safeAreaBottom}px`,
      }}
    >
      <NavBar
        safeAreaInsetTop
        className="recognition-history-page__navbar"
        back={<Text className="recognition-history-page__back">返回</Text>}
        onBackClick={handleBack}
      >
        <Text className="recognition-history-page__title">衣物识别</Text>
      </NavBar>

      {loading && batches.length === 0 ? (
        <View className="recognition-history-page__state">
          <Loading type="circular" />
        </View>
      ) : batches.length === 0 ? (
        <View className="recognition-history-page__state">
          <Text className="recognition-history-page__empty-title">
            还没有识别记录
          </Text>
          <Text className="recognition-history-page__empty-desc">
            在衣橱上传衣物照片后，记录会出现在这里
          </Text>
        </View>
      ) : (
        <ScrollView
          className="recognition-history-page__scroll"
          scrollY
          enhanced
          showScrollbar={false}
          lowerThreshold={120}
          onScrollToLower={handleScrollToLower}
        >
          <View className="recognition-history-page__list">
            {batches.map((batch) => (
              <RecognitionBatchCard
                key={batch._id}
                batch={batch}
                onClick={handleOpenBatch}
              />
            ))}
          </View>
          {listLoading ? (
            <View className="recognition-history-page__more">
              <Loading type="circular" />
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

export default RecognitionHistoryPage;
