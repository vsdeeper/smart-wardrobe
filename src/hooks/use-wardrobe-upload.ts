import { WARDROBE_BATCH_UPLOAD_MAX } from "@/constants/wardrobe";
import { useCallback, useRef, useState } from "react";
import { isWeapp } from "@/utils/platform";
import Taro from "@tarojs/taro";

import { createRecognitionBatchAndStart } from "@/services/recognition-batch";
import { fetchCreditBalance } from "@/services/credits";
import {
  canAffordRecognition,
  CREDITS_INSUFFICIENT_TOAST,
  CREDITS_RECHARGE_PAGE,
} from "@/utils/credits";
import { afterToastNavigate } from "@/utils/after-toast-navigate";
import {
  checkNeedPrivacyAuthorization,
  getMediaPickerErrorToast,
} from "@/utils/media-picker-error";
import { toUserMessage } from "@/utils/error-message";

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

      // 选图单独 try/catch：getMediaPickerErrorToast 仅处理 chooseMedia 错误，
      // 避免云函数/积分失败也被它误判并透传原始英文 errMsg
      let filePaths: string[];
      try {
        const chooseRes = await Taro.chooseMedia({
          count: WARDROBE_BATCH_UPLOAD_MAX,
          mediaType: ["image"],
          sourceType: ["album", "camera"],
        });
        filePaths = chooseRes.tempFiles
          .map((file) => file.tempFilePath)
          .filter(Boolean);
      } catch (pickErr) {
        const toast = getMediaPickerErrorToast(pickErr);
        if (toast) {
          Taro.showToast({ title: toast, icon: "none", duration: 3000 });
        }
        return;
      }

      if (filePaths.length === 0) return;

      setAdding(true);

      const creditSummary = await fetchCreditBalance();
      if (!canAffordRecognition(creditSummary.available)) {
        Taro.showToast({
          title: CREDITS_INSUFFICIENT_TOAST,
          icon: "none",
          duration: 3000,
        });
        afterToastNavigate(() => {
          Taro.navigateTo({ url: CREDITS_RECHARGE_PAGE });
        });
        return;
      }

      await createRecognitionBatchAndStart(filePaths);

      Taro.showToast({
        title: "识别中，可在我的查看",
        icon: "none",
        duration: 2500,
      });
    } catch (err) {
      console.warn("[wardrobe-upload]", err);
      Taro.showToast({
        title: toUserMessage(err, "上传失败，请稍后重试"),
        icon: "none",
      });
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
