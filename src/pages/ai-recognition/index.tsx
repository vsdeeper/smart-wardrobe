import { useCallback, useRef } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Loading, NavBar, Swipe } from "@nutui/nutui-react-taro";
import PageLoading from "@/components/PageLoading";
import { useAiRecognitionList } from "@/hooks/useAiRecognitionList";
import RecognitionItemCard from "./components/RecognitionItemCard";
import "./index.scss";

function AiRecognitionPage() {
  const {
    items,
    submitting,
    initialized,
    readonly,
    confirmStatus,
    handleRemove,
    handleEdit,
    handleBack,
    handleDiscard,
    handleConfirm,
  } = useAiRecognitionList();

  const swipeRefs = useRef(new Map<string, { close: () => void }>());
  const openSwipeIdRef = useRef<string | null>(null);

  const setSwipeRef = useCallback(
    (tempId: string, instance: { close: () => void } | null) => {
      if (instance) {
        swipeRefs.current.set(tempId, instance);
      } else {
        swipeRefs.current.delete(tempId);
      }
    },
    [],
  );

  const handleSwipeOpen = useCallback((tempId: string) => {
    if (openSwipeIdRef.current && openSwipeIdRef.current !== tempId) {
      swipeRefs.current.get(openSwipeIdRef.current)?.close();
    }
    openSwipeIdRef.current = tempId;
  }, []);

  const handleSwipeClose = useCallback(() => {
    openSwipeIdRef.current = null;
  }, []);

  const handleDelete = useCallback(
    (tempId: string) => {
      swipeRefs.current.get(tempId)?.close();
      handleRemove(tempId);
    },
    [handleRemove],
  );

  const handleEditItem = useCallback(
    (tempId: string) => {
      swipeRefs.current.get(tempId)?.close();
      handleEdit(tempId);
    },
    [handleEdit],
  );

  const { statusBarHeight, safeArea } = Taro.getWindowInfo();
  const safeAreaBottom = safeArea
    ? Taro.getWindowInfo().screenHeight - safeArea.bottom
    : 0;

  if (!initialized) {
    return (
      <View
        className="ai-recognition-page"
        style={{
          ["--sw-status-bar-height" as string]: `${statusBarHeight ?? 0}px`,
          ["--sw-safe-area-bottom" as string]: `${safeAreaBottom}px`,
        }}
      >
        <PageLoading className="ai-recognition-page__loading" />
      </View>
    );
  }

  const statusHint =
    confirmStatus === "confirmed"
      ? "已入库"
      : confirmStatus === "discarded"
        ? "已放弃"
        : null;

  return (
    <View
      className={[
        "ai-recognition-page",
        readonly && "ai-recognition-page--readonly",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ["--sw-status-bar-height" as string]: `${statusBarHeight ?? 0}px`,
        ["--sw-safe-area-bottom" as string]: `${safeAreaBottom}px`,
      }}
    >
      <NavBar
        safeAreaInsetTop
        className="ai-recognition-page__navbar"
        back={<Text className="ai-recognition-page__back">返回</Text>}
        onBackClick={handleBack}
      >
        <Text className="ai-recognition-page__title">AI 识别结果</Text>
      </NavBar>

      {statusHint ? (
        <View className="ai-recognition-page__status">
          <Text className="ai-recognition-page__status-text">{statusHint}</Text>
        </View>
      ) : null}

      <ScrollView
        className="ai-recognition-page__scroll"
        scrollY
        enhanced
        showScrollbar={false}
      >
        <View className="ai-recognition-page__list">
          {items.map((item) =>
            readonly ? (
              <RecognitionItemCard key={item.tempId} item={item} />
            ) : (
              <Swipe
                key={item.tempId}
                name={item.tempId}
                ref={(el) => setSwipeRef(item.tempId, el)}
                onOpen={() => handleSwipeOpen(item.tempId)}
                onClose={handleSwipeClose}
                rightAction={
                  <View className="ai-recognition-page__swipe-actions">
                    <View
                      className="ai-recognition-page__edit"
                      onClick={() => handleEditItem(item.tempId)}
                    >
                      <Text className="ai-recognition-page__edit-text">
                        编辑
                      </Text>
                    </View>
                    <View
                      className="ai-recognition-page__delete"
                      onClick={() => handleDelete(item.tempId)}
                    >
                      <Text className="ai-recognition-page__delete-text">
                        删除
                      </Text>
                    </View>
                  </View>
                }
              >
                <RecognitionItemCard item={item} />
              </Swipe>
            ),
          )}

          {items.length === 0 && (
            <View className="ai-recognition-page__empty">
              <Text className="ai-recognition-page__empty-text">
                {readonly
                  ? "暂无识别单品"
                  : "已全部删除，请返回或确认放弃"}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {!readonly ? (
        <View className="sw-action-bar">
          <View
            className={[
              "sw-btn sw-btn--block sw-btn--secondary",
              submitting && "sw-btn--disabled",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={handleDiscard}
          >
            <Text className="sw-btn__text">放弃</Text>
          </View>
          <View
            className={[
              "sw-btn sw-btn--block sw-btn--primary",
              items.length === 0 && "sw-btn--disabled",
              submitting && "sw-btn--loading",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={handleConfirm}
          >
            {submitting ? (
              <Loading
                type="circular"
                color="var(--sw-color-on-primary)"
                className="sw-btn-loading"
              />
            ) : (
              <Text className="sw-btn__text sw-btn__text--primary">确认</Text>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default AiRecognitionPage;
