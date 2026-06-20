import { useCallback, useRef, useState } from "react";
import Taro from "@tarojs/taro";
import { setTryOnDraft } from "@/services/tryOnDraft";
import { WARDROBE_BATCH_UPLOAD_MAX, type AiStatus } from "@/data/wardrobe";
import { setRecognitionDraft } from "@/services/recognitionDraft";
import { uploadAndRecognizeBatch } from "@/services/wardrobe";
import {
  ensurePrivacyAuthorize,
  getMediaPickerErrorToast,
} from "@/utils/mediaPickerError";

interface UseWardrobeUploadOptions {
  setAiStatus: React.Dispatch<React.SetStateAction<AiStatus>>;
  uploadFlowRef: React.MutableRefObject<boolean>;
}

export function useWardrobeUpload({
  setAiStatus,
  uploadFlowRef,
}: UseWardrobeUploadOptions) {
  const [adding, setAdding] = useState(false);
  const aiResetTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const scrollToTop = useCallback(() => {
    Taro.pageScrollTo({
      scrollTop: 0,
      duration: 300,
      selector: "#main-scroll",
    });
  }, []);

  const handleAddItem = useCallback(async () => {
    if (process.env.TARO_ENV !== "weapp") {
      Taro.showToast({ title: "请在微信小程序中使用", icon: "none" });
      return;
    }

    if (adding) return;

    try {
      uploadFlowRef.current = true;

      await ensurePrivacyAuthorize();

      const chooseRes = await Taro.chooseMedia({
        count: WARDROBE_BATCH_UPLOAD_MAX,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
      });

      const filePaths = chooseRes.tempFiles
        .map((file) => file.tempFilePath)
        .filter(Boolean);

      if (filePaths.length === 0) return;

      if (aiResetTimerRef.current) {
        clearTimeout(aiResetTimerRef.current);
        aiResetTimerRef.current = undefined;
      }

      const batchTotal = filePaths.length;
      scrollToTop();
      setAdding(true);
      setAiStatus((prev) => ({
        ...prev,
        phase: "uploading",
        progress: 0,
        batchCurrent: 1,
        batchTotal,
      }));

      const { succeeded, failed } = await uploadAndRecognizeBatch(
        filePaths,
        ({ current, total, phase }) => {
          const itemSpan = 100 / total;
          const base = (current - 1) * itemSpan;
          const progress =
            phase === "uploading"
              ? Math.round(base + itemSpan * 0.25)
              : Math.min(Math.round(base + itemSpan * 0.85), 99);

          setAiStatus((prev) => ({
            ...prev,
            phase: phase === "uploading" ? "uploading" : "recognizing",
            progress,
            batchCurrent: current,
            batchTotal: total,
          }));
        }
      );

      const successCount = succeeded.length;
      const failCount = failed.length;

      if (successCount > 0) {
        setAiStatus((prev) => ({
          ...prev,
          phase: "done",
          progress: 100,
          batchCurrent: undefined,
          batchTotal: undefined,
        }));

        if (failCount > 0) {
          Taro.showToast({
            title: `成功 ${successCount} 件，失败 ${failCount} 件`,
            icon: "none",
          });
        }

        setRecognitionDraft(succeeded);
        uploadFlowRef.current = false;
        setAdding(false);
        setAiStatus((prev) => ({
          ...prev,
          phase: "idle",
          progress: 0,
        }));

        await Taro.navigateTo({ url: "/pages/ai-recognition/index" });
        return;
      }

      setAiStatus((prev) => ({
        ...prev,
        phase: "idle",
        progress: 0,
        batchCurrent: undefined,
        batchTotal: undefined,
      }));

      Taro.showToast({
        title: failed[0]?.message || "识别失败",
        icon: "none",
      });
    } catch (err) {
      console.warn("[wardrobe-upload]", err);
      const toast = getMediaPickerErrorToast(err);
      if (toast) {
        Taro.showToast({ title: toast, icon: "none", duration: 3000 });
      }
      setAiStatus((prev) => ({
        ...prev,
        phase: "idle",
        progress: 0,
        batchCurrent: undefined,
        batchTotal: undefined,
      }));
    } finally {
      if (aiResetTimerRef.current) {
        clearTimeout(aiResetTimerRef.current);
        aiResetTimerRef.current = undefined;
      }
      uploadFlowRef.current = false;
      setAdding(false);
    }
  }, [adding, scrollToTop, setAiStatus, uploadFlowRef]);

  const handleAIStyling = useCallback(() => {
    setTryOnDraft({ mode: "wardrobe-cta" });
    Taro.redirectTo({ url: "/pages/try-on/index" });
  }, []);

  return {
    adding,
    handleAddItem,
    handleAIStyling,
  };
}
