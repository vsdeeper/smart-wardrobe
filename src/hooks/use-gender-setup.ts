import { Gender } from "@/types/profile";
import { isGenderSet } from "@/utils/profile";
import { useCallback, useRef, useState } from "react";


import { applyGenderSetupWithToast } from "@/services/apply-gender-setup";
import { fetchUserProfile } from "@/services/profile";
import { readProfileCache } from "@/services/profile-cache";

interface UseGenderSetupOptions {
  onSuccess?: () => void;
}

async function resolveProfileGender(): Promise<Gender | undefined> {
  const cached = readProfileCache()?.profile;
  if (isGenderSet(cached?.gender)) {
    return cached.gender;
  }
  const profile = await fetchUserProfile();
  return profile.gender;
}

export function useGenderSetup(options: UseGenderSetupOptions = {}) {
  const { onSuccess } = options;
  const [dialogVisible, setDialogVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const closeDialog = useCallback((result: boolean) => {
    setDialogVisible(false);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  const handleSelect = useCallback(
    async (gender: Gender) => {
      if (saving) return;
      setSaving(true);
      const saved = await applyGenderSetupWithToast(gender);
      setSaving(false);
      if (!saved) return;
      onSuccess?.();
      closeDialog(true);
    },
    [closeDialog, onSuccess, saving],
  );

  const handleCancel = useCallback(() => {
    if (saving) return;
    closeDialog(false);
  }, [closeDialog, saving]);

  const ensureGenderSet = useCallback(async (): Promise<boolean> => {
    const gender = await resolveProfileGender();
    if (isGenderSet(gender)) {
      return true;
    }

    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialogVisible(true);
    });
  }, []);

  return {
    dialogVisible,
    saving,
    ensureGenderSet,
    handleSelect,
    handleCancel,
  };
}
