import { useCallback, useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import type { ProfileEditableField } from "@/data/profile";
import { useUserProfile } from "@/hooks/useUserProfile";
import { fetchPhoneNumberByCode } from "@/services/phoneAuth";
import { uploadAvatar } from "@/services/profileAvatar";
import { openProfileFieldEdit } from "@/utils/openProfileFieldEdit";
import { getPhoneAuthErrorToast } from "@/utils/phoneAuthError";

function isWeapp(): boolean {
  return Taro.getEnv() === Taro.ENV_TYPE.WEAPP;
}

export function useMineProfileEdit() {
  const { profile, avatarUrl, loading, updating, updateProfile } =
    useUserProfile();

  const [nicknameDraft, setNicknameDraft] = useState("");

  useEffect(() => {
    setNicknameDraft(profile.nickname ?? "");
  }, [profile.nickname]);

  const handleBack = useCallback(() => {
    Taro.navigateBack();
  }, []);

  const openFieldEdit = useCallback(
    (field: ProfileEditableField) => {
      if (updating) return;
      openProfileFieldEdit(field);
    },
    [updating],
  );

  const handleChooseAvatar = useCallback(
    async (e: { detail: { avatarUrl?: string } }) => {
      if (!isWeapp()) {
        Taro.showToast({ title: "请在微信小程序中使用", icon: "none" });
        return;
      }
      if (updating) return;

      const tempPath = e.detail.avatarUrl;
      if (!tempPath) return;

      Taro.showLoading({ title: "上传中…" });
      try {
        const fileId = await uploadAvatar(tempPath);
        const ok = await updateProfile({ avatarFileId: fileId });
        if (ok) {
          Taro.showToast({ title: "头像已更新", icon: "success" });
        }
      } catch {
        Taro.showToast({ title: "头像上传失败", icon: "none" });
      } finally {
        Taro.hideLoading();
      }
    },
    [updateProfile, updating],
  );

  const handleNicknameInput = useCallback(
    (e: { detail: { value?: string } }) => {
      setNicknameDraft(e.detail.value ?? "");
    },
    [],
  );

  const handleNicknameBlur = useCallback(
    async (e: { detail: { value?: string } }) => {
      if (!isWeapp()) {
        Taro.showToast({ title: "请在微信小程序中使用", icon: "none" });
        return;
      }
      if (updating) return;

      const value = e.detail.value?.trim() ?? "";
      if (!value) return;

      const savedNickname = (profile.nickname ?? "").trim();
      if (value === savedNickname) return;

      setNicknameDraft(value);
      const ok = await updateProfile({ nickname: value });
      if (ok) {
        Taro.showToast({ title: "昵称已更新", icon: "success" });
      } else {
        setNicknameDraft(savedNickname);
      }
    },
    [profile.nickname, updateProfile, updating],
  );

  const handleGetPhoneNumber = useCallback(
    async (e: {
      detail: { errMsg?: string; code?: string };
    }) => {
      if (!isWeapp()) {
        Taro.showToast({ title: "请在微信小程序中使用", icon: "none" });
        return;
      }
      if (updating) return;

      if (e.detail.errMsg !== "getPhoneNumber:ok") {
        const toast = getPhoneAuthErrorToast(e.detail.errMsg);
        if (toast) {
          Taro.showToast({ title: toast, icon: "none", duration: 3000 });
        }
        return;
      }

      const code = e.detail.code;
      if (!code) {
        Taro.showToast({ title: "未获取授权码", icon: "none" });
        return;
      }

      Taro.showLoading({ title: "获取中…" });
      try {
        const phoneNumber = await fetchPhoneNumberByCode(code);
        const ok = await updateProfile({ phoneNumber });
        if (ok) {
          Taro.showToast({ title: "手机号已绑定", icon: "success" });
        }
      } catch {
        Taro.showToast({ title: "获取手机号失败", icon: "none" });
      } finally {
        Taro.hideLoading();
      }
    },
    [updateProfile, updating],
  );

  return {
    profile,
    avatarUrl,
    loading,
    updating,
    handleBack,
    openFieldEdit,
    handleChooseAvatar,
    nicknameDraft,
    handleNicknameInput,
    handleNicknameBlur,
    handleGetPhoneNumber,
  };
}
