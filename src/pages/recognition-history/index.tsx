import { useCallback } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import AppNavbar from "@/components/AppNavbar";
import PageLoading from "@/components/PageLoading";
import RecognitionBatchCard from "@/components/RecognitionBatchCard";
import {
  canOpenRecognitionBatch,
  RECOGNITION_HISTORY_PAGE_SIZE,
  type RecognitionBatch,
} from "@/data/recognition";
import { useRecognitionBatches } from "@/hooks/useRecognitionBatches";
import Main from "@/layouts/Main";
import { normalizeRecognitionErrorMessage } from "@/utils/recognition";
import "./index.scss";

function RecognitionHistoryPage() {
  const { batches, loading, listLoading, hasMore, loadMore } =
    useRecognitionBatches({
      pageSize: RECOGNITION_HISTORY_PAGE_SIZE,
      enablePagination: true,
    });

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

  return (
    <Main
      showTabbar={false}
      header={<AppNavbar showBack title="衣物识别" />}
    >
      <Main.Scroll
        lowerThreshold={120}
        onScrollToLower={handleScrollToLower}
      >
        {loading && batches.length === 0 ? (
          <PageLoading />
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
          <>
            <View className="recognition-history-page__list">
              {batches.map((batch) => (
                <RecognitionBatchCard
                  key={batch._id}
                  batch={batch}
                  onClick={handleOpenBatch}
                />
              ))}
            </View>
            {listLoading ? <PageLoading text="加载更多..." /> : null}
          </>
        )}
      </Main.Scroll>
    </Main>
  );
}

export default RecognitionHistoryPage;
