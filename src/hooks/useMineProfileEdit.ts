import { useCallback, useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import type { ProfileEditableField } from "@/data/profile";
import { useUserProfile } from "@/hooks/useUserProfile";
import { uploadAvatar } from "@/services/profileAvatar";
import { openProfileFieldEdit } from "@/utils/openProfileFieldEdit";
import { isWeapp } from "@/utils/platform";

export function useMineProfileEdit() {
  const { profile, avatarUrl, loading, updating, updateProfile, onAvatarLoadError } =
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
        Taro.showToast({ title: "头像没能更新，请稍后重试", icon: "none" });
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
    onAvatarLoadError,
  };
}
