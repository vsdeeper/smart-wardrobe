import { useCallback, useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import type { BaseEventOrig } from "@tarojs/components";
import type { InputProps } from "@tarojs/components/types/Input";
import type { ActionSheetProps } from "@nutui/nutui-react-taro";
import {
  GENDER_OPTIONS,
  type Gender,
  type ProfileMetric,
} from "@/data/profile";
import { useUserProfile } from "@/hooks/useUserProfile";
import { fetchPhoneNumberByCode } from "@/services/phoneAuth";
import { uploadAvatar } from "@/services/profileAvatar";

function isWeapp(): boolean {
  return Taro.getEnv() === Taro.ENV_TYPE.WEAPP;
}

export function useMineProfileEdit() {
  const { profile, avatarUrl, loading, updating, updateProfile } =
    useUserProfile();
  const [genderSheetVisible, setGenderSheetVisible] = useState(false);
  const [metricDialog, setMetricDialog] = useState<ProfileMetric | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [occupationDraft, setOccupationDraft] = useState("");

  useEffect(() => {
    setNicknameDraft(profile.nickname ?? "");
    setOccupationDraft(profile.occupation ?? "");
  }, [profile.nickname, profile.occupation]);

  const handleBack = useCallback(() => {
    Taro.navigateBack();
  }, []);

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

  const handleNicknameBlur = useCallback(
    async (e: BaseEventOrig<InputProps.inputValueEventDetail>) => {
      if (updating) return;

      const value = (e.detail.value ?? nicknameDraft).trim();
      if (value === (profile.nickname ?? "").trim()) return;

      await updateProfile({ nickname: value });
    },
    [nicknameDraft, profile.nickname, updateProfile, updating],
  );

  const handleOccupationBlur = useCallback(async () => {
    if (updating) return;

    const value = occupationDraft.trim();
    if (value === profile.occupation.trim()) return;

    await updateProfile({ occupation: value });
  }, [occupationDraft, profile.occupation, updateProfile, updating]);

  const handleGetPhoneNumber = useCallback(
    async (e: {
      detail: { errMsg?: string; code?: string };
    }) => {
      if (!isWeapp()) {
        Taro.showToast({ title: "请在微信小程序中使用", icon: "none" });
        return;
      }
      if (updating) return;

      if (e.detail.errMsg !== "getPhoneNumber:ok") return;

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

  const handleGenderSelect = useCallback<
    NonNullable<ActionSheetProps["onSelect"]>
  >(
    (item, _index) => {
      setGenderSheetVisible(false);
      if (updating) return;

      const label = typeof item.name === "string" ? item.name : "";
      const option = GENDER_OPTIONS.find((o) => o.label === label);
      if (!option || option.value === profile.gender) return;

      void updateProfile({ gender: option.value as Gender });
    },
    [profile.gender, updateProfile, updating],
  );

  const openGenderSheet = useCallback(() => {
    if (updating) return;
    setGenderSheetVisible(true);
  }, [updating]);

  const openMetricDialog = useCallback(
    (metric: ProfileMetric) => {
      if (updating) return;
      setMetricDialog(metric);
    },
    [updating],
  );

  const handleMetricClose = useCallback(() => {
    if (updating) return;
    setMetricDialog(null);
  }, [updating]);

  const handleMetricConfirm = useCallback(
    async (value: number) => {
      if (updating || !metricDialog) return;

      const patch =
        metricDialog === "height"
          ? { heightCm: value }
          : { weightKg: value };

      const ok = await updateProfile(patch);
      if (ok) {
        Taro.showToast({ title: "已保存", icon: "success" });
        setMetricDialog(null);
      }
    },
    [metricDialog, updateProfile, updating],
  );

  const metricInitialValue =
    metricDialog === "height"
      ? profile.heightCm
      : metricDialog === "weight"
        ? profile.weightKg
        : 0;

  const genderActionOptions = GENDER_OPTIONS.map((o) => ({ name: o.label }));

  return {
    profile,
    avatarUrl,
    loading,
    updating,
    nicknameDraft,
    occupationDraft,
    setNicknameDraft,
    setOccupationDraft,
    genderSheetVisible,
    setGenderSheetVisible,
    genderActionOptions,
    metricDialog,
    metricDialogVisible: metricDialog !== null,
    metricInitialValue,
    handleBack,
    handleChooseAvatar,
    handleNicknameBlur,
    handleOccupationBlur,
    handleGetPhoneNumber,
    handleGenderSelect,
    openGenderSheet,
    openMetricDialog,
    handleMetricClose,
    handleMetricConfirm,
  };
}
