import { useCallback, useRef } from "react";
import { View, Text } from "@tarojs/components";
import { Swipe } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import MediaListCard from "@/components/MediaListCard";
import PageLoading from "@/components/PageLoading";
import { useVisualDiaryList } from "@/hooks/useVisualDiaryList";
import Main from "@/layouts/Main";
import { formatDateTime } from "@/utils/formatDateTime";
import "./index.scss";

function VisualDiaryPage() {
  const {
    entries,
    initialLoading,
    listLoading,
    handleScrollToLower,
    handleViewDetail,
    handleDelete,
  } = useVisualDiaryList();

  const swipeRefs = useRef(new Map<string, { close: () => void }>());
  const openSwipeIdRef = useRef<string | null>(null);

  const setSwipeRef = useCallback(
    (entryId: string, instance: { close: () => void } | null) => {
      if (instance) {
        swipeRefs.current.set(entryId, instance);
      } else {
        swipeRefs.current.delete(entryId);
      }
    },
    [],
  );

  const handleSwipeOpen = useCallback((entryId: string) => {
    if (openSwipeIdRef.current && openSwipeIdRef.current !== entryId) {
      swipeRefs.current.get(openSwipeIdRef.current)?.close();
    }
    openSwipeIdRef.current = entryId;
  }, []);

  const handleSwipeClose = useCallback(() => {
    openSwipeIdRef.current = null;
  }, []);

  const handleView = useCallback(
    (entryId: string) => {
      swipeRefs.current.get(entryId)?.close();
      handleViewDetail(entryId);
    },
    [handleViewDetail],
  );

  const handleRemove = useCallback(
    (entryId: string, title: string) => {
      swipeRefs.current.get(entryId)?.close();
      void handleDelete(entryId, title);
    },
    [handleDelete],
  );

  return (
    <Main
      showTabbar={false}
      header={<AppNavbar showBack title="视觉日记" />}
    >
      <Main.Scroll
        lowerThreshold={120}
        onScrollToLower={handleScrollToLower}
      >
        {initialLoading ? (
          <PageLoading />
        ) : (
          <View className="visual-diary-page__list">
            {entries.map((entry) => {
              const entryId = entry._id ?? "";
              if (!entryId) return null;

              return (
                <Swipe
                  key={entryId}
                  name={entryId}
                  ref={(el) => setSwipeRef(entryId, el)}
                  onOpen={() => handleSwipeOpen(entryId)}
                  onClose={handleSwipeClose}
                  rightAction={
                    <View className="visual-diary-page__swipe-actions">
                      <View
                        className="visual-diary-page__view"
                        onClick={() => handleView(entryId)}
                      >
                        <Text className="visual-diary-page__view-text">
                          查看
                        </Text>
                      </View>
                      <View
                        className="visual-diary-page__delete"
                        onClick={() => handleRemove(entryId, entry.title)}
                      >
                        <Text className="visual-diary-page__delete-text">
                          删除
                        </Text>
                      </View>
                    </View>
                  }
                >
                  <MediaListCard
                    imageSrc={
                      entry.coverUrl || entry.coverFileId || undefined
                    }
                    title={entry.title}
                    time={formatDateTime(entry.createdAt)}
                    description={entry.description}
                  />
                </Swipe>
              );
            })}

            {entries.length === 0 && (
              <View className="visual-diary-page__empty">
                <Text className="visual-diary-page__empty-title">
                  还没有穿搭记录
                </Text>
                <Text className="visual-diary-page__empty-desc">
                  试穿后点击「就穿这一身」，记录将出现在这里
                </Text>
              </View>
            )}

            {listLoading && entries.length > 0 && (
              <PageLoading text="加载更多..." />
            )}
          </View>
        )}
      </Main.Scroll>
    </Main>
  );
}

export default VisualDiaryPage;
