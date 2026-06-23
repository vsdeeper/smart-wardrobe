import { useCallback, useEffect, useState } from "react";
import Taro, { useLoad } from "@tarojs/taro";
import {
  type Gender,
  type ProfileEditableField,
  isGenderSet,
  isProfileEditableField,
  PROFILE_EDITABLE_FIELDS,
} from "@/data/profile";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  isValidMetric,
  METRIC_INVALID_TOAST,
  parseMetricValue,
} from "@/utils/profileFieldValidation";

export function useMineProfileFieldEdit() {
  const { profile, loading, updating, updateProfile } = useUserProfile();
  const [field, setField] = useState<ProfileEditableField | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [genderDraft, setGenderDraft] = useState<Gender | null>(null);

  useLoad((options) => {
    const rawField = options.field;
    if (!isProfileEditableField(rawField)) {
      Taro.showToast({ title: "无效字段", icon: "none" });
      Taro.navigateBack();
      return;
    }
    setField(rawField);
  });

  useEffect(() => {
    if (!field || loading) return;

    if (field === "occupation") {
      setTextDraft(profile.occupation ?? "");
    } else if (field === "height") {
      setTextDraft(
        typeof profile.heightCm === "number" ? String(profile.heightCm) : "",
      );
    } else if (field === "weight") {
      setTextDraft(
        typeof profile.weightKg === "number" ? String(profile.weightKg) : "",
      );
    } else if (field === "gender") {
      setGenderDraft(isGenderSet(profile.gender) ? profile.gender : null);
    }
  }, [field, loading, profile]);

  const handleBack = useCallback(() => {
    Taro.navigateBack();
  }, []);

  const handleSave = useCallback(async () => {
    if (updating || !field) return;

    if (field === "occupation") {
      const value = textDraft.trim();
      if (value === profile.occupation.trim()) {
        Taro.navigateBack();
        return;
      }
      const ok = await updateProfile({ occupation: value });
      if (ok) {
        Taro.showToast({ title: "已保存", icon: "success" });
        Taro.navigateBack();
      }
      return;
    }

    if (field === "gender") {
      if (!isGenderSet(genderDraft)) {
        Taro.showToast({ title: "请选择性别", icon: "none" });
        return;
      }
      if (genderDraft === profile.gender) {
        Taro.navigateBack();
        return;
      }
      const ok = await updateProfile({ gender: genderDraft });
      if (ok) {
        Taro.showToast({ title: "已保存", icon: "success" });
        Taro.navigateBack();
      }
      return;
    }

    if (field === "height" || field === "weight") {
      const value = parseMetricValue(textDraft);
      if (value === null || !isValidMetric(field, value)) {
        Taro.showToast({ title: METRIC_INVALID_TOAST[field], icon: "none" });
        return;
      }

      const current = field === "height" ? profile.heightCm : profile.weightKg;
      if (value === current) {
        Taro.navigateBack();
        return;
      }

      const patch =
        field === "height" ? { heightCm: value } : { weightKg: value };
      const ok = await updateProfile(patch);
      if (ok) {
        Taro.showToast({ title: "已保存", icon: "success" });
        Taro.navigateBack();
      }
    }
  }, [
    field,
    genderDraft,
    profile.gender,
    profile.heightCm,
    profile.occupation,
    profile.weightKg,
    textDraft,
    updateProfile,
    updating,
  ]);

  const fieldMeta = field ? PROFILE_EDITABLE_FIELDS[field] : null;
  const canSaveGender = field !== "gender" || isGenderSet(genderDraft);

  return {
    field,
    fieldMeta,
    profile,
    loading,
    updating,
    textDraft,
    setTextDraft,
    genderDraft,
    setGenderDraft,
    canSaveGender,
    handleBack,
    handleSave,
  };
}
