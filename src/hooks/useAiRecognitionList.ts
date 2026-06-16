import { useCallback, useRef, useState } from "react";
import Taro, { useDidShow, useLoad, useUnload } from "@tarojs/taro";
import type { RecognizedPreviewItem } from "@/data/wardrobe";
import {
  clearRecognitionDraft,
  consumeRecognitionDraft,
} from "@/services/recognitionDraft";
import {
  clearRecognitionSession,
  getRecognitionSession,
  initRecognitionSession,
} from "@/services/recognitionSession";
import { deleteCloudFiles, saveWardrobeItems } from "@/services/wardrobe";

export function useAiRecognitionList() {
  const [items, setItems] = useState<RecognizedPreviewItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const allFileIdsRef = useRef<string[]>([]);
  const removedFileIdsRef = useRef<string[]>([]);
  const handledRef = useRef(false);

  useLoad(() => {
    const draft = consumeRecognitionDraft();
    if (!draft?.length) {
      Taro.navigateBack();
      return;
    }

    allFileIdsRef.current = draft.map((item) => item.imageFileId);
    initRecognitionSession(draft);
    setItems(draft);
    setInitialized(true);
  });

  useDidShow(() => {
    if (!initialized) return;
    setItems(getRecognitionSession());
  });

  useUnload(() => {
    if (handledRef.current) return;

    void deleteCloudFiles(allFileIdsRef.current);
    clearRecognitionDraft();
    clearRecognitionSession();
  });

  const handleRemove = useCallback((tempId: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.tempId === tempId);
      if (target) {
        removedFileIdsRef.current = [
          ...removedFileIdsRef.current,
          target.imageFileId,
        ];
      }
      const next = prev.filter((item) => item.tempId !== tempId);
      initRecognitionSession(next);
      return next;
    });
  }, []);

  const handleEdit = useCallback((tempId: string) => {
    Taro.navigateTo({
      url: `/pages/wardrobe-edit/index?source=recognition&tempId=${tempId}`,
    });
  }, []);

  const cleanupAndBack = useCallback(async () => {
    handledRef.current = true;
    await deleteCloudFiles(allFileIdsRef.current);
    clearRecognitionDraft();
    clearRecognitionSession();
    Taro.navigateBack();
  }, []);

  const handleDiscard = useCallback(() => {
    if (submitting) return;

    Taro.showModal({
      title: "确认放弃",
      content: "放弃后识别结果不会保存到衣橱",
      confirmText: "放弃",
      confirmColor: "#fa2c19",
      success: (res) => {
        if (res.confirm) {
          void cleanupAndBack();
        }
      },
    });
  }, [cleanupAndBack, submitting]);

  const handleConfirm = useCallback(async () => {
    if (submitting || items.length === 0) return;

    setSubmitting(true);
    try {
      const { saved, failed } = await saveWardrobeItems(items);
      handledRef.current = true;

      if (removedFileIdsRef.current.length > 0) {
        await deleteCloudFiles(removedFileIdsRef.current);
      }
      clearRecognitionDraft();
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
  }, [items, submitting]);

  return {
    items,
    submitting,
    initialized,
    handleRemove,
    handleEdit,
    handleDiscard,
    handleConfirm,
  };
}
