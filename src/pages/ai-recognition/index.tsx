import { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { ImagePreview, Loading, NavBar, Swipe } from "@nutui/nutui-react-taro";
import { useAiRecognitionList } from "@/hooks/useAiRecognitionList";
import RecognitionItemCard from "./components/RecognitionItemCard";
import "./index.scss";

function AiRecognitionPage() {
  const {
    items,
    submitting,
    initialized,
    handleRemove,
    handleDiscard,
    handleConfirm,
  } = useAiRecognitionList();

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const previewImages = useMemo(
    () => items.map((item) => ({ src: item.imageUrl || item.imageFileId })),
    [items],
  );

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

  const openPreview = useCallback((index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  }, []);

  const handleDelete = useCallback(
    (tempId: string) => {
      swipeRefs.current.get(tempId)?.close();
      setPreviewVisible(false);
      handleRemove(tempId);
    },
    [handleRemove],
  );

  const { statusBarHeight, safeArea } = Taro.getWindowInfo();
  const safeAreaBottom = safeArea
    ? Taro.getWindowInfo().screenHeight - safeArea.bottom
    : 0;

  if (!initialized) {
    return null;
  }

  return (
    <View
      className="ai-recognition-page"
      style={{
        ["--sw-status-bar-height" as string]: `${statusBarHeight ?? 0}px`,
        ["--sw-safe-area-bottom" as string]: `${safeAreaBottom}px`,
      }}
    >
      <NavBar
        safeAreaInsetTop
        className="ai-recognition-page__navbar"
        back={<Text className="ai-recognition-page__back">返回</Text>}
        onBackClick={handleDiscard}
      >
        <Text className="ai-recognition-page__title">AI 识别结果</Text>
      </NavBar>

      <ScrollView
        className="ai-recognition-page__scroll"
        scrollY
        enhanced
        showScrollbar={false}
      >
        <View className="ai-recognition-page__list">
          {items.map((item, index) => (
            <Swipe
              key={item.tempId}
              name={item.tempId}
              ref={(el) => setSwipeRef(item.tempId, el)}
              onOpen={() => handleSwipeOpen(item.tempId)}
              onClose={handleSwipeClose}
              rightAction={
                <View
                  className="ai-recognition-page__delete"
                  onClick={() => handleDelete(item.tempId)}
                >
                  <Text className="ai-recognition-page__delete-text">删除</Text>
                </View>
              }
            >
              <RecognitionItemCard
                item={item}
                onImageClick={() => openPreview(index)}
              />
            </Swipe>
          ))}

          {items.length === 0 && (
            <View className="ai-recognition-page__empty">
              <Text className="ai-recognition-page__empty-text">
                已全部删除，请返回或确认放弃
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View className="ai-recognition-actions">
        <View
          className={[
            "ai-recognition-actions__btn",
            "ai-recognition-actions__btn--secondary",
            submitting && "ai-recognition-actions__btn--disabled",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={handleDiscard}
        >
          <Text className="ai-recognition-actions__btn-text">放弃</Text>
        </View>
        <View
          className={[
            "ai-recognition-actions__btn",
            "ai-recognition-actions__btn--primary",
            (submitting || items.length === 0) &&
              "ai-recognition-actions__btn--disabled",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={handleConfirm}
        >
          {submitting ? (
            <Loading
              type="circular"
              color="var(--sw-color-on-primary)"
              className="ai-recognition-actions__loading"
            />
          ) : (
            <Text className="ai-recognition-actions__btn-text ai-recognition-actions__btn-text--primary">
              确认
            </Text>
          )}
        </View>
      </View>

      <ImagePreview
        key={previewIndex}
        visible={previewVisible}
        images={previewImages}
        defaultValue={previewIndex + 1}
        closeIcon
        pagination
        showMenuByLongpress
        onClose={() => setPreviewVisible(false)}
      />
    </View>
  );
}

export default AiRecognitionPage;
