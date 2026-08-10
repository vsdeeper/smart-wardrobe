import { useCallback, useRef } from "react";
import { View, Text } from "@tarojs/components";
import { Swipe } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import OutlineButton from "@/components/OutlineButton";
import PageLoading from "@/components/PageLoading";
import SolidButton from "@/components/SolidButton";
import { useAiRecognitionList } from "@/hooks/use-ai-recognition-list";
import Main from "@/layouts/Main";
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

  const statusHint =
    confirmStatus === "confirmed"
      ? "已入库"
      : confirmStatus === "discarded"
        ? "已放弃"
        : null;

  return (
    <Main
      showTabbar={false}
      scrollClassName={
        initialized && !readonly ? "main-scroll--ai-recognition" : undefined
      }
      header={<AppNavbar showBack title="AI 识别结果" />}
    >
      <Main.Scroll>
        {!initialized ? (
          <PageLoading className="ai-recognition-page__loading" />
        ) : (
          <>
            {statusHint ? (
              <View className="ai-recognition-page__status">
                <Text className="ai-recognition-page__status-text">
                  {statusHint}
                </Text>
              </View>
            ) : null}

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
                      ? "这次没有认出单品"
                      : "已全部删除，请返回或确认放弃"}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </Main.Scroll>

      {initialized && !readonly ? (
        <View className="sw-action-bar">
          <OutlineButton block disabled={submitting} onClick={handleDiscard}>
            放弃
          </OutlineButton>
          <SolidButton
            block
            disabled={items.length === 0}
            loading={submitting}
            onClick={handleConfirm}
          >
            确认
          </SolidButton>
        </View>
      ) : null}
    </Main>
  );
}

export default AiRecognitionPage;
