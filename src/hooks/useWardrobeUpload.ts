import { useCallback, useRef, useState } from "react";
import { isWeapp } from "@/utils/platform";
import Taro from "@tarojs/taro";
import { WARDROBE_BATCH_UPLOAD_MAX } from "@/data/wardrobe";
import { createRecognitionBatchAndStart } from "@/services/recognitionBatch";
import {
  checkNeedPrivacyAuthorization,
  getMediaPickerErrorToast,
} from "@/utils/mediaPickerError";

interface UseWardrobeUploadOptions {
  uploadFlowRef: React.MutableRefObject<boolean>;
  ensureGenderSet: () => Promise<boolean>;
}

export function useWardrobeUpload({
  uploadFlowRef,
  ensureGenderSet,
}: UseWardrobeUploadOptions) {
  const [adding, setAdding] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [privacyContractName, setPrivacyContractName] = useState("");
  const pendingUploadAfterPrivacyRef = useRef(false);

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

      setAdding(true);

      await createRecognitionBatchAndStart(filePaths);

      Taro.showToast({
        title: "识别中，可在我的查看",
        icon: "none",
        duration: 2500,
      });
    } catch (err) {
      console.warn("[wardrobe-upload]", err);
      const toast = getMediaPickerErrorToast(err);
      if (toast) {
        Taro.showToast({ title: toast, icon: "none", duration: 3000 });
      } else {
        const message = err instanceof Error ? err.message : "上传失败，请稍后重试";
        Taro.showToast({ title: message, icon: "none" });
      }
    } finally {
      uploadFlowRef.current = false;
      setAdding(false);
    }
  }, [uploadFlowRef]);

  const startUploadFlow = useCallback(async () => {
    const genderReady = await ensureGenderSet();
    if (!genderReady) return;
    await runPickAndUpload();
  }, [ensureGenderSet, runPickAndUpload]);

  const handleAddItem = useCallback(async () => {
    if (!isWeapp()) {
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

  return {
    adding,
    privacyVisible,
    privacyContractName,
    handleAddItem,
    handlePrivacyAgreed,
    closePrivacyDialog,
  };
}
