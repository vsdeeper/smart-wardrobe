import { useCallback, useRef, useState } from "react";
import Taro from "@tarojs/taro";
import { setTryOnDraft } from "@/services/tryOnDraft";
import { WARDROBE_BATCH_UPLOAD_MAX, type AiStatus } from "@/data/wardrobe";
import { setRecognitionDraft } from "@/services/recognitionDraft";
import { uploadAndRecognizeBatch } from "@/services/wardrobe";
import {
  checkNeedPrivacyAuthorization,
  getMediaPickerErrorToast,
} from "@/utils/mediaPickerError";

interface UseWardrobeUploadOptions {
  setAiStatus: React.Dispatch<React.SetStateAction<AiStatus>>;
  uploadFlowRef: React.MutableRefObject<boolean>;
  ensureGenderSet: () => Promise<boolean>;
}

export function useWardrobeUpload({
  setAiStatus,
  uploadFlowRef,
  ensureGenderSet,
}: UseWardrobeUploadOptions) {
  const [adding, setAdding] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [privacyContractName, setPrivacyContractName] = useState("");
  const aiResetTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingUploadAfterPrivacyRef = useRef(false);

  const scrollToTop = useCallback(() => {
    Taro.pageScrollTo({
      scrollTop: 0,
      duration: 300,
      selector: "#main-scroll",
    });
  }, []);

  const runPickAndUpload = useCallback(async () => {
    try {
      uploadFlowRef.current = true;

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
          let progress: number;
          if (phase === "uploading") {
            progress = Math.round(base + itemSpan * 0.2);
          } else if (phase === "recognizing") {
            progress = Math.round(base + itemSpan * 0.45);
          } else {
            progress = Math.min(Math.round(base + itemSpan * 0.95), 99);
          }

          setAiStatus((prev) => ({
            ...prev,
            phase,
            progress,
            batchCurrent: current,
            batchTotal: total,
          }));
        },
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
  }, [scrollToTop, setAiStatus, uploadFlowRef]);

  const startUploadFlow = useCallback(async () => {
    const genderReady = await ensureGenderSet();
    if (!genderReady) return;
    await runPickAndUpload();
  }, [ensureGenderSet, runPickAndUpload]);

  const handleAddItem = useCallback(async () => {
    if (process.env.TARO_ENV !== "weapp") {
      Taro.showToast({ title: "请在微信小程序中使用", icon: "none" });
      return;
    }

    if (adding) return;

    const privacy = await checkNeedPrivacyAuthorization();
    if (privacy.needAuthorization) {
      pendingUploadAfterPrivacyRef.current = true;
      setPrivacyContractName(privacy.privacyContractName ?? "");
      setPrivacyVisible(true);
      return;
    }

    await startUploadFlow();
  }, [adding, startUploadFlow]);

  const closePrivacyDialog = useCallback(() => {
    pendingUploadAfterPrivacyRef.current = false;
    setPrivacyVisible(false);
  }, []);

  const handlePrivacyAgreed = useCallback(() => {
    setPrivacyVisible(false);
    if (pendingUploadAfterPrivacyRef.current) {
      pendingUploadAfterPrivacyRef.current = false;
      void startUploadFlow();
    }
  }, [startUploadFlow]);

  const handleAIStyling = useCallback(async () => {
    const genderReady = await ensureGenderSet();
    if (!genderReady) return;
    setTryOnDraft({ mode: "wardrobe-cta" });
    Taro.redirectTo({ url: "/pages/try-on/index" });
  }, [ensureGenderSet]);

  return {
    adding,
    privacyVisible,
    privacyContractName,
    handleAddItem,
    handlePrivacyAgreed,
    closePrivacyDialog,
    handleAIStyling,
  };
}
