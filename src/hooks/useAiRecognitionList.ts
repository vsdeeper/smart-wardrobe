import { useCallback, useRef, useState } from "react";
import Taro, { useDidShow, useLoad, useUnload } from "@tarojs/taro";
import type { RecognizedPreviewItem } from "@/data/wardrobe";
import type { RecognitionConfirmStatus } from "@/data/recognition";
import {
  clearRecognitionSession,
  getRecognitionSession,
  initRecognitionSession,
} from "@/services/recognitionSession";
import {
  confirmRecognitionBatch,
  discardRecognitionBatch,
  fetchRecognitionBatchById,
  updateRecognitionBatchItems,
} from "@/services/recognitionBatch";
import {
  resolvePreviewImageUrls,
  saveWardrobeItems,
} from "@/services/wardrobe";

export function useAiRecognitionList() {
  const [items, setItems] = useState<RecognizedPreviewItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [readonly, setReadonly] = useState(false);
  const [confirmStatus, setConfirmStatus] =
    useState<RecognitionConfirmStatus>("pending");

  const batchIdRef = useRef<string | null>(null);
  const allFileIdsRef = useRef<string[]>([]);
  const handledRef = useRef(false);
  const initializedRef = useRef(false);
  const readonlyRef = useRef(false);

  const persistItems = useCallback(
    async (next: RecognizedPreviewItem[]) => {
      const batchId = batchIdRef.current;
      if (!batchId) return;
      try {
        await updateRecognitionBatchItems(batchId, next);
      } catch (err) {
        console.warn("[ai-recognition] persist items failed", err);
      }
    },
    [],
  );

  useLoad(async (options) => {
    const batchId =
      typeof options?.batchId === "string" ? options.batchId.trim() : "";

    if (!batchId) {
      Taro.showToast({ title: "缺少识别记录", icon: "none" });
      setTimeout(() => Taro.navigateBack(), 500);
      return;
    }

    try {
      const batch = await fetchRecognitionBatchById(batchId);

      if (batch.status !== "succeeded") {
        const title =
          batch.status === "processing"
            ? "识别中，请稍候"
            : batch.errorMessage || "识别失败";
        Taro.showToast({ title, icon: "none" });
        setTimeout(() => Taro.navigateBack(), 800);
        return;
      }

      const rawItems = batch.items ?? [];
      const withUrls = await resolvePreviewImageUrls(rawItems);

      batchIdRef.current = batchId;
      allFileIdsRef.current = withUrls.map((item) => item.imageFileId);
      const isReadonly = batch.confirmStatus !== "pending";
      readonlyRef.current = isReadonly;
      initializedRef.current = true;
      setReadonly(isReadonly);
      setConfirmStatus(batch.confirmStatus);
      initRecognitionSession(withUrls);
      setItems(withUrls);
      setInitialized(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载失败";
      Taro.showToast({ title: message, icon: "none" });
      setTimeout(() => Taro.navigateBack(), 800);
    }
  });

  useDidShow(() => {
    if (!initializedRef.current || readonlyRef.current) return;
    const session = getRecognitionSession();
    if (session.length === 0 && allFileIdsRef.current.length === 0) return;
    setItems(session);
    allFileIdsRef.current = session.map((item) => item.imageFileId);
    void persistItems(session);
  });

  useUnload(() => {
    clearRecognitionSession();
  });

  const handleRemove = useCallback(
    (tempId: string) => {
      if (readonly) return;
      setItems((prev) => {
        const next = prev.filter((item) => item.tempId !== tempId);
        initRecognitionSession(next);
        allFileIdsRef.current = next.map((item) => item.imageFileId);
        void persistItems(next);
        return next;
      });
    },
    [persistItems, readonly],
  );

  const handleEdit = useCallback(
    (tempId: string) => {
      if (readonly) return;
      Taro.navigateTo({
        url: `/pages/wardrobe-edit/index?source=recognition&tempId=${tempId}`,
      });
    },
    [readonly],
  );

  const handleBack = useCallback(() => {
    Taro.navigateBack();
  }, []);

  const handleDiscard = useCallback(() => {
    if (submitting || readonly) return;

    const batchId = batchIdRef.current;
    if (!batchId) return;

    Taro.showModal({
      title: "确认放弃",
      content: "放弃后识别结果不会保存到衣橱",
      confirmText: "放弃",
      confirmColor: "#fa2c19",
      success: (res) => {
        if (!res.confirm) return;
        void (async () => {
          setSubmitting(true);
          try {
            handledRef.current = true;
            await discardRecognitionBatch(batchId);
            clearRecognitionSession();
            Taro.navigateBack();
          } catch (err) {
            const message = err instanceof Error ? err.message : "操作失败";
            Taro.showToast({ title: message, icon: "none" });
          } finally {
            setSubmitting(false);
          }
        })();
      },
    });
  }, [readonly, submitting]);

  const handleConfirm = useCallback(async () => {
    if (submitting || readonly || items.length === 0) return;

    const batchId = batchIdRef.current;
    if (!batchId) return;

    setSubmitting(true);
    try {
      const { saved, failed } = await saveWardrobeItems(items);
      handledRef.current = true;

      await updateRecognitionBatchItems(batchId, items);
      await confirmRecognitionBatch(batchId);
      clearRecognitionSession();

      if (failed.length > 0) {
        Taro.showToast({
          title: `成功 ${saved.length} 件，失败 ${failed.length} 件`,
          icon: "none",
        });
      } else {
        Taro.showToast({
          title: saved.length === 1 ? "已加入衣橱" : `已加入 ${saved.length} 件`,
          icon: "success",
        });
      }

      Taro.navigateBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : "入库失败";
      Taro.showToast({ title: message, icon: "none" });
    } finally {
      setSubmitting(false);
    }
  }, [items, readonly, submitting]);

  return {
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
  };
}
